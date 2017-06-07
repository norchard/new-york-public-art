#!/usr/bin/env ruby

require 'net/http'
require 'aws-sdk'
require 'dotenv'

Dotenv.load

uri = URI('https://www.nycgovparks.org/bigapps/DPR_PublicArt_001.json')
response = Net::HTTP.get_response(uri)

if response.code != "200"
  $stderr.puts "Failed to read response: #{response}"
  exit 1
end

s3 = Aws::S3::Resource.new(region:'us-east-1')
bucket = s3.bucket(ENV['S3_BUCKET'])
obj = bucket.object('data/DPR_PublicArt_001.json')
obj.put({acl: "public-read", body: response.body})
