var imgUrls = {}

d3.json("./data/artwork.json", function(err, data) {
    drawMap(data)
});

function drawMap(geojson){

    mapboxgl.accessToken = 'pk.eyJ1Ijoibm9yY2hhcmQiLCJhIjoiY2oyMHcxNXNhMDUwMTMzbnVkcmJ1eWszdSJ9.Dx5NmmL0h6xm3cUE5jLuJg'

    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v9',
        center: [-73.9700, 40.7568],
        zoom: 10
    });

    var container = map.getCanvasContainer();
    var svg = d3.select(container).append("svg")
                .attr("width", "100%")
                .attr("height", "100vh")
                .attr("position", "absolute")

    var transform = d3.geoTransform({point: projectPoint});
    var path = d3.geoPath().projection(transform);

    var color = d3.scaleOrdinal(d3.schemeCategory20);

    var locations = svg.selectAll("path")
      .data(geojson)
      .enter()
      .append("path")
      .attr("d", path.pointRadius(function(d) {
          if (d3.select(this).attr('class') == 'select')
            return 20;
          else
            return 8;
       }))
      // .attr("d", d3.geoPath().projection(transform))
      .attr("fill", function(d) { return color(d.properties.number); })
      .attr("stroke-width", 2)
      .attr("stroke", "white")
      .attr('id', function(d) { return d.properties.number; })
      .on("click", function(d) { clickHandler(d) })

    geojson.forEach(function (artwork, index) {
        d3.select('#text')
          .append('div')
          .attr('id', index)
          .attr('class', 'artwork')
          .style('background-color',function(d) { return color(artwork.properties.number); })
          .append('h2')
          .html(artwork.properties.name)
          .on("click", function() { clickHandler(artwork) })
          .append("p")
          .attr('class', 'artist')
          .html( artwork.properties.artist);
    });

    function clickHandler(d) {
      close();

      document.getElementById(d.properties.number).scrollIntoView()

      map.flyTo({center: d.geometry.coordinates})

      // d3.select('text').select(this.childNodes)
      //   .attr('class', 'hide');

      var artDiv = d3.selectAll('div')
        .filter(function() { return d3.select(this).attr("id") == d.properties.number })

      // var formatDate = d3.timeFormat("%B")
      // var start = new Date(d.properties.from_date)
      // var end = new Date(d.properties.to_date)

      artDiv.append('span')
        .html(d.properties.description)
        .append('button')
        .html('close')
        .on("click", close)

      svg.selectAll("path")
        .filter(function(){return d3.select(this).attr("id") == d.properties.number; })
        .attr('class', 'select')

      function toQueryString(paramsObject) {
        return Object
          .keys(paramsObject)
          .map(key => `${encodeURIComponent(key)}=${paramsObject[key]}`)
          .join('&')
        ;
      }

      function httpGetAsync(theUrl, callback)
      {
          var xhr = new XMLHttpRequest()
          xhr.open("GET", theUrl, true) // true for asynchronous
          xhr.setRequestHeader('Ocp-Apim-Subscription-Key', '03235899f7754611a972827f7ccfc286')
          xhr.onreadystatechange = function() {
              if (xhr.readyState == 4 && xhr.status == 200)
                  callback(xhr.responseText)
          };
          xhr.send(null)
      }

      var searchQuery = `${d.properties.name.replace(/\s/g,'+')}+%22${d.properties.artist.replace(/\s/g,'+')}%22+NYC`

      var searchParams = {
        count: 1,
        aspect: 'wide',
        mkt: 'en-us',
        imageType: 'Photo',
        size: 'large',
        q: searchQuery
      }

      var searchURL = 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=' + toQueryString(searchParams)

      httpGetAsync(searchURL, function(response) {
          var data = JSON.parse(response)
          console.log(data)
          // console.log(data.value[0].contentUrl);
          if (data.value.length > 0){
          artDiv.select('span')
            .append('div').attr('class','image-div')
            .append('img').attr('src',data.value[0].contentUrl).attr('class','image')
          } else {

          }
            // .append('img').attr('src',data.items[0].link).attr('class','image')

      });
    }

    function close() {
      d3.selectAll("path").classed("select", false);

      d3.selectAll('span')
        .remove();
    }

    function update() {
        locations.attr("d", path);
    }

    map.on("viewreset", update )
    map.on("move", update )

    update()

    function projectPoint(lon, lat) {
      var point = map.project(new mapboxgl.LngLat(lon, lat));
      this.stream.point(point.x, point.y);
    }
}
