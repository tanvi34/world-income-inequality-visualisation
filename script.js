// Settings:
var minYear = 1800
var maxYear = 2020
var legendValues = [0, 30, 40, 50, 60]
var minVal = 24 // Not used atm
var maxVal = 64 // Not used atm
var title = 'How it works'
var startPageText =
  'This visualization present how income inequality has changed over time, and how the levels of inequality in different countries can vary significantly. \n\n The inequality is measured through the Gini coefficient. The value ranges from 0 to 100, where 0 equals total equality and 100 total inequality.'

// Creates yearspan and retrieves active year
var yearSpan = [...Array(maxYear - minYear).keys()]
  .map(x => x + minYear)
  .filter(x => x % 10 === 0)
var year = document.getElementById('selected-year').innerHTML
var yearAvg = Array(maxYear - minYear)
var selectedCountry

// Retrieve slider div
var slider = document.getElementById('slider'),
  selectedYearDiv = document.getElementById('selected-year')

// Triggers if user uses slider
slider.oninput = function() {
  selectedYearDiv.innerHTML = this.value
  year = this.value
  if (selectedCountry) {
    activeCountry(selectedCountry)
    updateSidebar()
    tip.show()
  } else {
    reFillMap()
    initSidebar()
  }
}

// The svg
var svg = d3.select('svg'),
  width = +svg.attr('width'),
  height = +svg.attr('height')

// Map and projection
var path = d3.geoPath()
var projection = d3.geoMercator().scale(90)

// Data, geoJSON and color scale
var data = d3.map()
var rich = d3.map()
var poor = d3.map()
var population = d3.map()
var nrPoor = d3.map()
var avgIncome = d3.map()

var topo
var colorScale = d3
  .scaleThreshold()
  .domain(legendValues)
  .range(d3.schemeReds[legendValues.length + 1]) // why + 1?? :S

// Load geoJSON and CSV
Promise.all([
  d3
    .json(
      'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'
    )
    .then(data => {
      topo = data
    }),
  d3.csv('csv/gini.csv').then(d => {
    d.map(x => {
      data.set(x.country, x)
    })
  }),
  d3.csv('csv/income_share_of_poorest_10percent.csv').then(d => {
    d.map(x => {
      poor.set(x.country, x)
    })
  }),
  d3.csv('csv/income_share_of_richest_10percent.csv').then(d => {
    d.map(x => {
      rich.set(x.country, x)
    })
  }),
  d3.csv('csv/number_of_people_in_poverty.csv').then(d => {
    d.map(x => {
      nrPoor.set(x.country, x)
    })
  }),
  d3.csv('csv/population_total.csv').then(d => {
    d.map(x => {
      population.set(x.country, x)
    })
  }),
]).then(drawMap)

// Get average GINI for current year
function getAvg() {
  var sum = 0
  var tot = 0
  for (var i in data) {
    var d = data[i][year]
    if (d) {
      sum += +d
      tot++
    }
  }
  var avg = Math.floor(sum / tot)
  var yearText = document.getElementById('selected-year')
  yearText.style.color = colorScale(avg)
  var yearText = document.getElementById('year-avg')
  yearText.innerText = 'World average this year: ' + avg
}

// Tooltip
var tip = d3
  .tip()
  .attr('class', 'd3-tip')
  .offset([-5, 0])
  .html(function(d) {
    if (selectedCountry)
      return selectedCountry + ': ' + data.get(selectedCountry)[year]
    var val = data.get(d.properties.name) && data.get(d.properties.name)[year]
    if (val) {
      return d.properties.name + ': ' + val
    } else {
      return d.properties.name + ': No data.'
    }
  })

svg.call(tip)

// Draw the map
function drawMap() {
  svg
    .append('g')
    .selectAll('path')
    .data(topo.features)
    .enter()
    .append('path')
    // draw each country
    .attr('d', d3.geoPath().projection(projection))
    .attr('class', 'country')
    .on('mouseover', d => {
      if (!selectedCountry) tip.show(d)
    })
    .on('mouseout', d => {
      if (!selectedCountry) tip.hide(d)
    })
    .on('click', clickedCountry)
    // set the color of each country
    .attr('fill', function(d) {
      d.total =
        (data.get(d.properties.name) && data.get(d.properties.name)[year]) || 0
      if (d.total === 0) return '#bbb'
      return colorScale(d.total)
    })
  getAvg()
  initSidebar()
}

// Draw legend
var legend = document.getElementById('legend')
var cols = d3.schemeReds[legend.length]

for (var i = 0; i < legendValues.length; i++) {
  var element = document.createElement('div')
  element.className = 'l-' + i
  element.style.background = colorScale(legendValues[i])
  var text
  if (i === 0) text = '<' + legendValues[i + 1]
  else if (i === legendValues.length - 1) text = '>' + legendValues[i]
  else text = legendValues[i] + '-' + legendValues[i + 1]
  element.innerText = text
  legend.appendChild(element)
}


// Draw on map
function reFillMap() {
  svg.selectAll('path').attr('fill', function(d) {
    d.total =
      (data.get(d.properties.name) && data.get(d.properties.name)[year]) || 0
    if (d.total === 0) return '#bbb'
    return colorScale(d.total)
  })
  getAvg()
  var button1 = document.getElementsByTagName('button')[0]
  var button2 = document.getElementsByTagName('button')[1]
  button1.style.visibility = 'hidden'
  button2.style.visibility = 'hidden'
}

// Change color on active country
function activeCountry(selectedCountry) {
  svg.selectAll('path').attr('fill', function(d) {
    d.total =
      (data.get(d.properties.name) && data.get(d.properties.name)[year]) || 0
    if (d.total === 0)
      return `#bbbbbb${selectedCountry == d.properties.name ? '' : '30'}`
    return `${colorScale(
      d.total
    )}${selectedCountry == d.properties.name ? '' : '30'}`
  })
}

function clickedCountry(d) {
  let copy = selectedCountry

  selectedCountry = d.properties.name
  var element = document.getElementById('country-title')
  element.innerText = selectedCountry
  var button1 = document.getElementsByTagName('button')[0]
  var button2 = document.getElementsByTagName('button')[1]

  if (copy == d.properties.name) {
    reFillMap()
    tip.hide(d)
    selectedCountry = null
    initSidebar()
  } else {
    tip.show(d)
    activeCountry(d.properties.name)
    updateSidebar()
    button1.style.visibility = 'visible'
    button2.style.visibility = 'visible'
  }
}

function updateSidebar() {
  var maintext = document.getElementsByTagName('section')[0]
  maintext.style.display = 'none'
  var pop =
    (population.get(selectedCountry) &&
      population.get(selectedCountry)[year]) ||
    0
  var numPoor =
    (nrPoor.get(selectedCountry) && nrPoor.get(selectedCountry)[year]) || 0

  var textBlock = document.getElementById('country-text')
  textBlock.innerHTML = ''
  var textPop = document.createElement('p')
  textPop.innerHTML =
    'Population: <span class="bigger">' +
    (pop == 0
      ? 'N/A'
      : pop / 1000000 > 1000
      ? pop / 1000000000 + ' billion'
      : pop / 1000000 + ' million')
  textPop.innerHTML += '</span>'
  var textNrPoor = document.createElement('p')
  textNrPoor.innerHTML =
    'People living below 1.25$/day: <span class="bigger">' +
    (numPoor === 0 ? 'N/A</span>' : numPoor + ' million</span>')
  var textAvgIncome

  textBlock.appendChild(textPop)
  textBlock.appendChild(textNrPoor)

  var richMoney = rich.get(selectedCountry)[year] || 0
  var poorMoney = poor.get(selectedCountry)[year] || 0

  if (richMoney === 0 || poorMoney === 0) {
    var pie = document.getElementById('pie-chart')
    pie.innerHTML = ''
  } else {
    bb.generate({
      data: {
        columns: [
          ['Income share of richest 10%', richMoney],
          ['Income share of poorest 10%', poorMoney],
          ['The rest', 100 - richMoney - poorMoney],
        ],
        color: function(color, d) {
          return {
            'Income share of richest 10%': '#000',
            'Income share of poorest 10%': '#f00',
            'The rest': '#fff',
          }[d]
        },
        type: 'pie',
      },
      bindto: '#pie-chart',
      interaction: {
        enabled: false,
      },
      legend: {
        item: {
          onclick: () => {},
        },
      },
    })
  }
}

function initSidebar() {
  var maintext = document.getElementsByTagName('section')[0]
  maintext.style.display = 'block'
  var cTitle = document.getElementById('info-title')
  cTitle.innerText = title
  var parent = document.getElementById('info-text')
  parent.innerText = startPageText
  parent.innerHTML +=
    '<br /><br /><i><b>The map is interactive. You can  you the slider to select different years and click on specific countries.</b></i>'

  cTitle = document.getElementById('country-title')
  cTitle.innerText = 'Country details'
  parent = document.getElementById('country-text')
  parent.innerText =
    'Click on a country on the map to get specific information.'
  var pie = document.getElementById('pie-chart')
  pie.innerHTML = ''
}

function reset() {
  selectedCountry = null
  initSidebar()
  reFillMap()
  
}

var chart = bb.generate({
  size: {
    height: 540,
    width: 1280
  },
  data: {
    x: "x",
    columns: [
	["x", 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020],
["China",41.9,41.3,40.6,40,39.4,39.2,39.1,39.1,39.1,39.1],
["India",35,35.1,35.1,35.1,35.1,35.1,35.1,35.1,35.1,35.1],
["Luxembourg",32,32,32.7,33,32.9,33.3,33.8,33.8,33.8,33.8],
["Ireland",32.9,32.8,32.7,32.4,32.2,31.8,31.8,31.8,31.8,31.8],
["Qatar",40,40,40,40,40,40,40,40,40,40],
["Liberia",34.6,34.2,33.8,33.5,33.3,33.2,33.2,33.2,33.2,33.2],
["Ethiopia",33.5,34.5,35.5,36.7,37.7,38.4,38.8,39.1,39.1,39.1],
["Niger",33.2,33,33.1,33.7,34.1,34.3,34.3,34.3,34.3,34.3],
    ],
    colors: {
      Luxembourg: "#336600",
      Ireland: "#336600",
      Qatar: "#336600",
      China: "#FF9933",
      India: "#FF9933",
      Liberia: "#CC0000",
      Ethiopia: "#CC0000",
      Niger: "#CC0000"
    },
    color: function(color, d) {
	// d will be "id" when called for legends
	return (d.id && d.id === "data3") ?
		d3.rgb(color).darker(d.value / 150).toString() : color;
   }
  },
  
  bindto: "#lineChart"
});

