// TODO: Update data source and process data:
// 'https://www.nycgovparks.org/bigapps/DPR_PublicArt_001.json'

const mapAccessToken = 'pk.eyJ1Ijoibm9yY2hhcmQiLCJhIjoiY2oyMHcxNXNhMDUwMTMzbnVkcmJ1eWszdSJ9.Dx5NmmL0h6xm3cUE5jLuJg'

d3.json("./data/artwork.json", (err, data) => drawMap(data))

function createMap() {
  mapboxgl.accessToken = mapAccessToken

  var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v9',
      center: [-73.9700, 40.7568],
      zoom: 10
  })

  return map
}

function drawMap(geojson){

  var map = createMap()

  //Create d3 svg
  var container = map.getCanvasContainer()
  var svg = d3.select(container)
              .append("svg")
              .attr("width", "100%")
              .attr("height", "100vh")
              .attr("position", "absolute")

  function projectPoint(lon, lat) {
    var point = map.project(new mapboxgl.LngLat(lon, lat));
    this.stream.point(point.x, point.y);
  }

  var transform = d3.geoTransform({point: projectPoint});
  var path = d3.geoPath().projection(transform);

  var color = d3.scaleOrdinal(d3.schemeCategory20);

  var points = svg.selectAll("path")
                  .data(geojson)
                  .enter()
                  .append("path")
                  .attr("d", path.pointRadius(function(d) {
                      if (d3.select(this).attr('class') == 'select')
                        return 20;
                      else
                        return 8;
                   }))
                  .attr("fill", d => color(d.properties.number))
                  .attr("stroke-width", 2)
                  .attr("stroke", "white")
                  .on("click", d => clickHandler(d, map))

  geojson.forEach(function (artwork, index) {
      artwork.properties.path = points.filter( (d,i) => { return i == index })
      artwork.properties.div = d3.select('#text').append('div')

      artwork.properties.div
          .attr('class', 'artwork')
          .style('background-color', d => { return color(index) })
        .append('h2')
          .html(artwork.properties.name)
          .on("click", () => { clickHandler(artwork, map) })
        .append("p")
          .attr('class', 'artist')
          .html( artwork.properties.artist)

  })

    function update() {
        points.attr("d", path);
    }

    map.on("viewreset", update)
    map.on("move", update)

    update()
}

function clickHandler(d, map) {

  function close() {
    d3.selectAll("path").classed("select", false)
    d3.selectAll('span').remove()
  }

  close()

  var artDiv = d.properties.div
  var artPath = d.properties.path

  artDiv.node().scrollIntoView()
  map.flyTo({center: d.geometry.coordinates})
  artPath.attr('class', 'select')

  // TODO: add date
  // var formatDate = d3.timeFormat("%B")
  // var start = new Date(d.properties.from_date)
  // var end = new Date(d.properties.to_date)

  var span = artDiv.append('span')

  span.html(d.properties.description)
      .append('button')
      .html('close')
      .on("click", close)

  getImage(d)
}

function httpGetAsync(theUrl, callback) {
    var xhr = new XMLHttpRequest()
    xhr.open("GET", theUrl, true) // true for asynchronous
    xhr.setRequestHeader('Ocp-Apim-Subscription-Key', '03235899f7754611a972827f7ccfc286')
    xhr.onreadystatechange = () => {
        if (xhr.readyState == 4 && xhr.status == 200)
            callback(xhr.responseText)
    }
    xhr.send(null)
}

function toQueryString(paramsObject) {
  return Object
    .keys(paramsObject)
    .map(key => `${encodeURIComponent(key)}=${paramsObject[key]}`)
    .join('&')
}

var imgUrls = {}

function getImage(d) {

  var artDiv = d.properties.div
  var artPath = d.properties.path
  var artIndex = d.properties.number

  function addImage(artDiv){
    if (imgUrls[artIndex] != ""){
      var imgDiv = artDiv.select('span')
                         .append('div')
                         .attr('class','image-div')

      var img = imgDiv.append('img')
                      .attr('class','image')
                      .attr('id','image')

      img.attr('src', imgUrls[artIndex])
    }
  }

  if (imgUrls[artIndex]) {
    addImage(artDiv)
    return
  }

  var searchParams = {
    count: 1,
    aspect: 'wide',
    mkt: 'en-us',
    imageType: 'Photo',
    size: 'large',
    q: `${d.properties.name.replace(/\s/g,'+')}+%22${d.properties.artist.replace(/\s/g,'+')}%22+NYC`
  }

  var searchURL = 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=' + toQueryString(searchParams)

  httpGetAsync(searchURL, response => {
      var data = JSON.parse(response)

      console.log('hi from httpGetAsync')
      if (data.value.length > 0) {
        imgUrls[artIndex] = data.value[0].contentUrl
        addImage(artDiv)
      } else {
        imgUrls[artIndex] = ""
      }
  })
}
