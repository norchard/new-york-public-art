// TODO: Update data source and process data:
// 'https://www.nycgovparks.org/bigapps/DPR_PublicArt_001.json'

const mapAccessToken = 'pk.eyJ1Ijoibm9yY2hhcmQiLCJhIjoiY2oyMHcxNXNhMDUwMTMzbnVkcmJ1eWszdSJ9.Dx5NmmL0h6xm3cUE5jLuJg'

d3.json('./data/DPR_PublicArt_001.json', (err, data) => drawMap(convertToGeoJson(data).filter((d) => { return new Date(d.properties.from_date) < new Date() && d.geometry.coordinates[0] != null })))

function convertToGeoJson(artData){
  return artData.map((artObject, index) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [artObject.lng, artObject.lat]
    },
    properties: {
      name: artObject.name,
      artist: artObject.artist,
      from_date: artObject.from_date,
      to_date: artObject.to_date,
      description: artObject.description,
      borough: artObject.borough,
      url: artObject.url
    }
  }))
}

function drawMap(geojson) {
  // Initialize Mapbox view over New York City
  mapboxgl.accessToken = mapAccessToken
  var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v9',
      center: [-73.9500, 40.770],
      zoom: 10.3
  })

  // Create d3 container to plot artwork points
  var container = map.getCanvasContainer()
  var svg = d3.select(container)
              .append("svg")
              .attr("width", "100%")
              .attr("height", "100vh")
              .attr("position", "absolute")

  // Map d3 projection coordinates to Mapbox map coordinates
  function projectPoint(lon, lat) {
    var point = map.project(new mapboxgl.LngLat(lon, lat));
    this.stream.point(point.x, point.y);
  }
  var transform = d3.geoTransform({point: projectPoint});
  var path = d3.geoPath().projection(transform);

  var color = d3.scaleLinear()
  .domain([0, 2, 4, 6, 8, 10, 12, 14, 16, 18])
  .range(["#f2563a", "#f2b721", "#ff8647", "#99aa00", "#4297dd", "#19b78a", "#6c6afc", "#ce3bc9", "#ff5661"]);
  // var color = d3.scaleOrdinal(d3.schemeCategory20);

  var points = svg.selectAll("path")
                  .data(geojson)
                  .enter()
                  .append("path")
                  // Point radius closure could not be written as an arrow function
                  // because arrow functions do not bind `this`
                  .attr("d", path.pointRadius(function(d) {
                      if (d3.select(this).attr('class') == 'select')
                        return 20;
                      else
                        return 8;
                   }))
                  .attr("fill", (d,i) => color(i % 18))
                  .attr("stroke-width", 2)
                  .attr("stroke", "white")
                  .on("click", d => clickHandler(d, map, update))
                  .on("mouseover", d => handleMouseOver(d))
                  .on("mouseout", d => handleMouseOut(d))

  var labels = svg.selectAll(".label")
                .data(geojson)
                .enter()
                .append("text")
                .attr("class", "label hide")
                .attr("fill", (d,i) => color(i % 18))
                .attr("x", (d) => (path.centroid(d)[0] + 10))
                .attr("y", (d) => (path.centroid(d)[1] + 4))
                .attr("max-width", "150px")
                .text((d,i) => (d.properties.name).toString())

  function handleMouseOver(d){ d.properties.label.classed("hide", false) }
  function handleMouseOut(d){ d.properties.label.classed("hide", true) }

  geojson.forEach(function (artwork, index) {
    artwork.properties.label = labels.filter((d, i) => i == index)
    artwork.properties.path = points.filter((d, i) => i == index)
    artwork.properties.div = d3.select('#text').append('div')

    artwork.properties.div
        .attr('class', 'artwork')
        .style('background-color', d => { return color(index % 18) })
      .append('h2')
        .html(artwork.properties.name)
        .on("click", () => { clickHandler(artwork, map, update) })
      .append("p")
        .attr('class', 'artist')
        .classed('no-wrap', true)
        .html(artwork.properties.artist)
  })

  function update() {
    points.attr("d", path)
    labels.attr("x", (d) => (path.centroid(d)[0] + 10))
          .attr("y", (d) => (path.centroid(d)[1] + 4))
  }
  map.on("viewreset", update)
  map.on("move", update)
  update()
}

// Click handler for both points and information divs
function clickHandler(d, map, update) {
  var closeMe = false
  var artDiv = d.properties.div
  var artPath = d.properties.path

  if (artDiv.select('div.selected').empty() == false)
    closeMe = true

  function close() {
    d3.selectAll("path").classed("select", false)
    d3.selectAll('div.selected').remove()
  }
  close()
  update()
  if(closeMe)
    return

  d3.selectAll('div').filter().attr('class', 'hide')
  map.flyTo({center: d.geometry.coordinates})
  artPath.attr('class', 'select')
  artDiv.select('h2').attr('class', 'select')

  var selected = artDiv.append('div').attr('class', 'selected')

  var formatDate = d3.timeFormat("%b %d, %Y")
  var start = new Date(d.properties.from_date)
  var end = new Date(d.properties.to_date)

  selected.html(d.properties.description)
      .insert('p', 'p')
      .html(formatDate(start) + ' – ' + formatDate(end))

  var imgDiv = artDiv.select('div.selected')
                     .append('div')
                     .attr('class','image-div')

  var img = imgDiv.append('img')
                  .attr('class','image')
                  .attr('id','image')
                  .on('load', () => artDiv.node().scrollIntoView())

  img.attr('src', d.properties.url)

  artDiv.node().scrollIntoView()
}
