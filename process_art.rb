#!/usr/bin/env ruby

require "json"

# json = $stdin.read
json = File.read('./public/data/DPR_PublicArt_001.json')

artworks = JSON.parse(json, :symbolize_names => true)

new_json = []
number = 0

artworks.each_with_index do |art, index|
  $stderr.print "."

  new_json << {
    :type => "Feature",
    :geometry => {
      :type => "Point",
      :coordinates => [art[:lng], art[:lat]]
    },
    :properties => {
      :name => art[:name],
      :artist => art[:artist],
      :from_date => art[:from_date],
      :to_date => art[:to_date],
      :description => art[:description],
      :borough => art[:borough],
      :number => number
    }
  }

  number += 1
end

puts JSON.pretty_generate(new_json)
