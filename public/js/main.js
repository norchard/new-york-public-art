// TODO: Update data source and process data:
// 'https://www.nycgovparks.org/bigapps/DPR_PublicArt_001.json'

const mapAccessToken = 'pk.eyJ1Ijoibm9yY2hhcmQiLCJhIjoiY2oyMHcxNXNhMDUwMTMzbnVkcmJ1eWszdSJ9.Dx5NmmL0h6xm3cUE5jLuJg'

d3.json('./data/DPR_PublicArt_001.json', (err, data) => drawMap(convertToGeoJson(data).filter((d) => { return new Date(d.properties.from_date) < new Date() })))

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
      number: index
    }
  }))
}

function drawMap(geojson) {
  // Initialize Mapbox view over New York City
  mapboxgl.accessToken = mapAccessToken
  var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v9',
      center: [-73.9700, 40.7568],
      zoom: 10
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
                  .attr("fill", d => color(d.properties.number % 18))
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
                .attr("fill", d => color(d.properties.number % 18))
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

  artDiv.node().scrollIntoView()
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

  getImage(d)
}

function httpGetAsync(theUrl, callback) {
  const subKey = '03235899f7754611a972827f7ccfc286'
  var xhr = new XMLHttpRequest()
  xhr.open("GET", theUrl, true) // true for asynchronous
  xhr.setRequestHeader('Ocp-Apim-Subscription-Key', subKey)
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
imgUrls[["Descension", "Anish Kapoor"]] = "http://www.lonelyplanet.com/news/wp-content/uploads/2017/05/Anish-Kapoors-latest-art-installation-at-Brooklyn-Bridge-Park-James-Ewing.jpg"
imgUrls[['Untitled', 'Gabriel Sierra']] = ""
imgUrls[['Monumental Sculptures at Prospect Park', 'Carole Eisner']] = "https://assets.dnainfo.com/generated/photo/2016/05/skipper-by-carole-eisner-1463519634.JPG/extralarge.jpg"
imgUrls[['Boogie Down Booth', 'Chat Travieso']] = "https://www.nycgovparks.org/sub_things_to_do/attractions/public_art/images/fullsize/chat-travieso-boogie-down-booth-lg.jpg"
imgUrls[['Model to Monument (M2M)', 'Art Students League']] = "https://www.theartstudentsleague.org/wp-content/uploads/2016/05/M2M-0706-fx-975x650.jpg"
imgUrls[['TotemOh', 'Kenny Scharf']] = "https://media.timeout.com/images/103592432/630/472/image.jpg"
imgUrls[['Rene', 'Jacob Farber']] = "https://www.nycgovparks.org/sub_things_to_do/attractions/public_art/images/fullsize/jacob-farber-rene-lg__57b6fd6234e8f.jpg"
imgUrls[['Bronx Tracks', 'Diana Perea']] = "https://www.nycgovparks.org/sub_things_to_do/attractions/public_art/images/fullsize/diana-perea-bronx-tracks-lg__57c44a9fe1558.jpg"
imgUrls[['Who\'s Afraid to Listen to Red, Black and Green?', 'Kevin Beasley']] = "http://uptowncollective.com/wp-content/uploads/2017/05/UC-Kevin-Beasley-Who-is-Afraid-to-Listen-to-Red-Black-and-Green.jpg"
imgUrls[['A particularly elaborate imba yokubikira, or kitchen house, stands locked up while its owners live in diaspora', 'Simone Leigh']] = "https://news.artnet.com/app/news-upload/2016/08/Simone-Leigh.jpeg"
imgUrls[['Sentra', 'Kori Newkirk']] = "https://www.nycgovparks.org/sub_things_to_do/attractions/public_art/images/fullsize/kori-newkirk-sentra-lg__57c5a8207d160.jpg"
imgUrls[['Black Rock Negative Energy Absorber', 'Rudy Shepherd']] = "https://artsandarchitecture.psu.edu/sites/artsandarchitecture.psu.edu/files/black-rock-first-park-620x465.jpg"
imgUrls[['Tree Reflections', 'Susan Stair']] = "http://untappedcities.wpengine.netdna-cdn.com/wp-content/uploads/2016/11/Susan-Stair-Tree-Reflections-Untapped-Cities-AFineLyne-2.jpg"
imgUrls[['Beyond the Edge', 'Phyllis Hammond']] = "http://hammarskjoldplaza.org/dagwp13/wp-content/uploads/2016/11/Hammond-Sculpture-enhanced.jpg"
imgUrls[['Little Oil Well', 'Martin Ramone Delossantos']] = "http://untappedcities.wpengine.netdna-cdn.com/wp-content/uploads/2016/11/Martin-Ramone-Delossantos-sculpture-Untapped-Cities-AFineLyne.jpg"
imgUrls[['Spirit of New York City', 'Yasumitsu Morito']] = "http://blancavalbuena.com/wp-content/uploads/2013/08/yasumitsu-morito-spirit-riverside-park-940x624.jpg"
imgUrls[['Wishing Well', 'Amanda Long']] = "https://i.vimeocdn.com/video/627167017_780x439.jpg"
imgUrls[['New York Made: Stanton Street Courts', 'KAWS']] = "http://s3.amazonaws.com/nikeinc/assets/63798/MINY-KAWS-COURT-3_native_1600.jpg?1478723948"
imgUrls[['Double Doily', 'Jennifer Cecere']] = "http://media-cache-ec0.pinimg.com/736x/a1/1c/32/a11c325092c6a74cba744e4267945181.jpg"
imgUrls[['...and We Breath', 'Art Students League']] = ""
imgUrls[['Birdhouse Repo', 'Aaron Schraeter']] = "https://assets.dnainfo.com/photo/2017/2/1486411314-290242/extralarge.jpg"
imgUrls[['Hippo Ballerina', 'Bjorn Skaarup']] = "http://www.moment-newyork.de/wp-content/uploads/GrosseTiere2.jpg"
imgUrls[['Open House', 'Liz Glynn']] = "https://img.artrabbit.com/events/liz-glynn-open-house/images/CmGXWWBWIwFZ/1500x1007/GlynnL-3132-jpg.jpg"
imgUrls[['the floaters', 'Henry Taylor']] = "http://bestblacknews.com/wp-content/uploads/2017/03/taylor-thefloaters.jpg"
imgUrls[['Light Spectrum', 'Antonia A Perez']] = "http://img-cache.oppcdn.com/img/v1.0/s:50354/t:QkxBTksrVEVYVCtIRVJF/p:12/g:tl/o:2.5/a:50/q:90/1919x1215-cnz4QjzghnRGHqXO.jpg/1919x1215/5e72c7ba1e47c11caa84586020d31eba.jpg"

function getImage(d) {
  var artDiv = d.properties.div
  var artPath = d.properties.path
  // var artIndex = d.properties.number
  var artIndex = [d.properties.name, d.properties.artist]


  function addImage(artDiv){
    if (imgUrls[artIndex] != ""){
      var imgDiv = artDiv.select('div.selected')
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
    q: `${d.properties.name.replace(/\s/g,'+')}+%22${d.properties.artist.replace(/\s/g,'+')}%22+New+York+City`
  }

  var searchURL = 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=' + toQueryString(searchParams)


  httpGetAsync(searchURL, response => {
    var data = JSON.parse(response)

    if (data.value.length > 0) {
      imgUrls[artIndex] = data.value[0].contentUrl
      addImage(artDiv)
    } else {
      imgUrls[artIndex] = ""
    }
  })
}
