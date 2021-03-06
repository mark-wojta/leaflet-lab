/* JavaScript by Mark Wojta, 2020 */
// majority of JS credited to UW Wisconsin-Madison Department of Geography

// creates map and calls data
function addMap(){
    //creates map
    var map = L.map('map').setView([42.65, -92.06], 5);

    // adds map tile set
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/outdoors-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1IjoibWFyay13b2p0YSIsImEiOiJjazVpc2M0a2IwaHQzM2RtbmZpbXlodjdoIn0.piF_xAWNFZ2dxBhQ8CwXyw'
    }).addTo(map);

    //adds Data
    addData(map);
};

  //import geoJSON data and call functions
  function addData(map){
      //Import GeoJSON data
      $.ajax("data/realGDP.geojson", {
          dataType: "json",
          success: function(response){
              //create an attributes array
              var attributes = processData(response);
              //call functions
              createPropSymbols(response, map, attributes);
              createSequenceControls(map, attributes);
              createLegend(map, attributes);
          }
      });
  };

//build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];
    //properties of the first feature in the dataset
    var properties = data.features[0].properties;
    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("20") > -1){
            attributes.push(attribute);
        };
    };
    return attributes;
};

//Add circle markers for point features to the map
//function filter credited to https://badajos.github.io/NetMigrationMap/index.html
function createPropSymbols(data, map, attributes){

    var attribute = attributes[0];

    var allData = L.layerGroup([]);

    //creates a Leaflet GeoJSON layer and add it to the map
    var realGDP = L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    });
    allData.addLayer(realGDP);
    allData.addTo(map);
    filter(allData, map);
    return attribute;
    return myData;

    //create filters
    function filter(allData, map) {
        $("#filterGroup").change(function() {
            var choice = $("input[name=fltGDP]:checked").val()
            //console.log(choice)
            if (choice === "All") {
                createPropSymbols(data, map, attributes)
            }

            allData.clearLayers();
            map.removeLayer(allData);

            var realGDP = L.geoJson(null, {

            pointToLayer: function(feature, latlng){
                return pointToLayer(feature, latlng, attributes);
            },
            filter: function(feature, layer) {
                        return (feature.properties.multiState == choice);
                    },
            });

            // Get GeoJSON data and create features.

            $.getJSON('data/realGDP.geojson', function(data) {
                    realGDP.addData(data);
            });

            allData.addLayer(realGDP);
            allData.addTo(map);
        });
    };
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Assign the current attribute based on the first index of the attributes array
    var attribute = attributes[0];
    //create marker options
    var options = {
        fillColor: "#3c3",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7
    };
    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);
    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);
    //create circle marker layer
    var layer = L.circleMarker(latlng, options);
    //call function to add attributs to circle marker
    createPopup(feature.properties, attribute, layer, options.radius);
    //event listeners to open popup on hover and fill panel on click
    layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        }
    });
    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 10;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);
    return radius;
};

function createPopup(properties, attributes, layer, radius){
    //added Metropolitan Stastical Area
    var popupContent = "<p>MSA: <b>" + properties.MSA + "</b></p>";
    //add city to popup content string
    popupContent += "<p>Predominantly Associated City: <b>" + properties.city + "</b></p>";
    //add formatted attribute to panel content string
    var year = attributes;
    popupContent += "<p>MSA's Real GDP in " + year + ": <b>$" + properties[attributes] + " billion</b></p>";
    //added states containing MSA
    popupContent += "<p>MSA's States:<b>" + properties.states + "</b></p>";
    //replace the layer popup
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-radius)
    });
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attributes){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attributes]){
            //access feature properties
            var props = layer.feature.properties;
            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attributes]);
            layer.setRadius(radius);
            createPopup(props, attributes, layer, radius);
            updateLegend(map, attributes);
            updateSequenceControls(map, attributes);
        };
    });
};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attributes){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;
    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attributes]);
            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };
            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });
    //set mean
    var mean = (max + min) / 2;
    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

function updateSequenceControls(map, attributes){
    //create content for temporal div
    var year = attributes;
    var content = "Year: " + year;
    //replace legend content
    $('#time-legend').html(content);
};

//Create new sequence controls
function createSequenceControls(map, attributes){
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },
        onAdd: function (map) {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');
            //add temporal div to container
            $(container).append('<div id="time-legend">');
            //create range input element (slider)
            $(container).append('<input class="range-slider" type="range">');
            //skip buttons
            $(container).append('<button class="skip" id="reverse">Reverse</button>');
            $(container).append('<button class="skip" id="forward">Skip</button>');
            //kill any mouse event listeners on the map
            $(container).on('mousedown dblclick', function(e){
            L.DomEvent.stopPropagation(e);
            });
            //Disable dragging when user's cursor enters the element
            container.addEventListener('mouseover', function () {
                map.dragging.disable();
            });
            //Re-enable dragging when user's cursor leaves the element
            container.addEventListener('mouseout', function () {
                map.dragging.enable();
            });
            // ... initialize other DOM elements, add listeners, etc.
            return container;
        }
     });
    map.addControl(new SequenceControl());
    updateSequenceControls(map, attributes[0]);
    //set slider attributes
    $('.range-slider').attr({
        max: 17,
        min: 0,
        value: 0,
        step: 1
    });
    //replace button content with images
    $('#reverse').html('<img src="img/backButton.svg">');
    $('#forward').html('<img src="img/nextButton.svg">');
    //click listener for buttons
    $('.skip').click(function(){
        //get the old index value
        var index = $('.range-slider').val();
        //increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++;
            //if past the last attribute, wrap around to first attribute
            index = index > 17 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            //if past the first attribute, wrap around to last attribute
            index = index < 0 ? 17 : index;
        };
        //update slider
        $('.range-slider').val(index);
        //pass new attribute to update symbols
        updatePropSymbols(map, attributes[index]);
    });
    //input listener for slider
    $('.range-slider').on('input', function(){
        //get the new index value
        var index = $(this).val();
        //pass new attribute to update symbols
        updatePropSymbols(map, attributes[index]);
    });
};

//Update the legend with new attribute
function updateLegend(map, attributes){
    //create content for legend
    var year = attributes;
    var content = "Real GDP in " + year;
    //replace legend content
    $('#temporal-legend').html(content);
    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attributes);
    for (var key in circleValues){
        //get the radius
        var radius = calcPropRadius(circleValues[key]);
        //assign the cy and r attributes
        $('#'+key).attr({
            cy: 92 - radius,
            r: radius
        });
        //add legend text
        $('#'+key+'-text').text("$" + Math.round(circleValues[key]*100)/100 + " billion");
    };
};

//creates legend
function createLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },
        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');
            //add temporal legend div to container
            $(container).append('<div id="temporal-legend">');
            //start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="190px" height="170px" margin="center">';
            //object to base loop on...replaces Example 3.10 line 1
            var circles = {
                max: 30,
                mean: 60,
                min: 85
            };
            //loop to add each circle and text to svg string
            for (var circle in circles){
                //circle string
                svg += '<circle class="legend-circle" id="' + circle + '" fill="#3c3" fill-opacity="0.7" stroke="#000000" cx="45"/>';
                //text string
                svg += '<text id="' + circle + '-text" x="104" y="' + circles[circle] + '"></text>';
            };
                //close svg string
                svg += "</svg>";
            //add attribute legend svg to container
            $(container).append(svg);
            return container;
        }
    });
    map.addControl(new LegendControl());
    updateLegend(map, attributes[0]);
};

//jquery method ready() makes sure entire page has loaded
$(document).ready(addMap);
