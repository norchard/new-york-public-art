#!/usr/bin/env ruby

# Script running daily in cronjob on Digital Ocean VM
# to pull data from NYC Open Data source and upload to S3
# because NYC Open Data does not have cross-origin request (CORS) headers
# Also, adding image URLs to data with Google custom search API

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
