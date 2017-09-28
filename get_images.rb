#!/usr/bin/env ruby

require 'net/http'
require 'aws-sdk'
require 'dotenv'
require 'json'

Dotenv.load

def httpGet(url)
  uri = URI(url)
  response = Net::HTTP.get_response(uri)

  if response.code != "200"
    $stderr.puts "Failed to read response: #{response}"
    exit 1
  end

  response
end

cache = JSON.parse(File.read('./cache.json'))
response = httpGet('https://www.nycgovparks.org/bigapps/DPR_PublicArt_001.json')
data = JSON.parse(response.body)
data.each do |artwork|

  print '.'
  artwork["name"] = "" if !artwork["name"]
  artwork["artist"] = "" if !artwork["artist"]

  index = artwork["name"] + ' ' + artwork["artist"]
  if !cache[index]
    search_params = {
       :key => 'AIzaSyBuoyL7dU_KmnG_MYB9i1uG2meT_BL9qcg',
       :cx => '008601265566446087848:kj2rcgrvxrk',
       :imgType => 'photo',
       :searchType => 'image',
       :imageSize => 'large',
       :num => 1,
       :tbs => 'iar:w',
       :q => "#{artwork["name"].downcase.gsub(/\s/, '+')}" +
            "+#{artwork["artist"].downcase.gsub(/\s/, '+')}" +
            "+new+york+city"
     }
    search_params_string = search_params.map{ |key, value| "#{key}=#{value}"}.join('&')
    searchURL = "https://www.googleapis.com/customsearch/v1?#{search_params_string}"
    response = httpGet(searchURL)
    cache[index] = JSON.parse(response.body)['items'][0]['link']
  end

  artwork['url'] = cache[index]

end

File.open('./cache.json', 'w'){ |f| f.write(JSON.generate(cache)) }
data_body = JSON.generate(data)

s3 = Aws::S3::Resource.new(region:'us-east-1')
bucket = s3.bucket(ENV['S3_BUCKET'])
obj = bucket.object('data/DPR_PublicArt_001.json')
obj.put({acl: "public-read", body: data_body})

  # BING
  # search_params = {
  #   :count => 1,
  #   :aspect => "wide",
  #   :mkt => "en-us",
  #   :imageType => "Photo",
  #   :size => "large",
  #   :q => "#{artwork["name"].downcase.gsub(/\s/, '+') if artwork["name"]}"\
  #         "+#{artwork["artist"].downcase.gsub(/\s/, '+') if artwork["artist"]}"\
  #         "+new+york+city"
  # }
  # searchHeaders = {'Ocp-Apim-Subscription-Key' => SUBKEY} 03235899f7754611a972827f7ccfc286
  # searchURL = "https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=#{toQueryString(search_params)}"
