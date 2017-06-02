#!/usr/bin/env ruby

require 'net/http'
require 'aws-sdk'
require 'dotenv'

Dotenv.load

uri = URI('https://www.nycgovparks.org/bigapps/DPR_PublicArt_001.json')
json = Net::HTTP.get(uri)

File.open("temp.json", "w") { |temp| temp.write(json) }

s3 = Aws::S3::Resource.new(region:'us-east-1')
bucket = s3.bucket(ENV['S3_BUCKET'])
obj = bucket.object('test/test/DPR_PublicArt.json')
obj.delete
obj.upload_file("temp.json")

File.delete('temp.json')
