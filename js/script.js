// Define the UK bounds
var ukBounds = L.latLngBounds(
  L.latLng(49.5, -10.5), // Southwest coordinates (latitude, longitude)
  L.latLng(61.0, 2.1)    // Northeast coordinates (latitude, longitude)
);

var map = L.map('map', {
  maxBounds: ukBounds,
  maxBoundsViscosity: 1.0,
  minZoom: 5,  // Adjust as needed
  maxZoom: 18  // Adjust as needed
});

// Set the view to the UK bounds
map.fitBounds(ukBounds);

// Add CartoDB Positron tile layer
var baseTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  noWrap: true
}).addTo(map);

// Map event listeners
// Hide info box when clicking on the map (outside polygons)
map.on('click', function (e) {
  var infoBox = document.getElementById('info-box');
  if (infoBox) {
    infoBox.classList.add('hidden');
  }
});

// Create custom panes
var displayMode = 'both'; // 'points', 'polygons', or 'both'
map.createPane('polygonsPane');
map.getPane('polygonsPane').style.zIndex = 400; // Below markerPane (600)

map.getPane('markerPane').style.zIndex = 600;

// Ensure popupPane is above other panes
map.getPane('popupPane').style.zIndex = 700;

// Global variables
var csvData;
var localAuthoritiesLayer;
var finalAreasLayer;
var finalAreasGeoJSONData;
var scaleupData;
var scaleupLayers = {};
var searchControl;
var legend;
var layerControl;
var sectorControl;
var clusterControl;
var clusterRegions = {};
var clusterLayers = {};
var currentSectors = []; // Array to hold selected sectors
var currentClusters = []; // Array to hold selected clusters
var polygonVisibility = false;
var clusterColors = {};
var sectorColors = {};
var sectorPolygonLayers = {};
var clusterSummaryData = {}; // Object to hold summary data for clusters
var sectorStats = {}; // Object to hold overall statistics per sector
var polygonToggleControl = null; // Initialize as null
var allPolygons = [];
var currentHighlightedPolygon = null;
var allPolygons = []; // Global array to store all polygons
var highlightedPolygons = [];
var magnifyingGlass;

// List of company numbers to exclude
var excludedCompanyNumbers = [
  '12405751','8924217','575914','7187537','9922859','8761455','1765758','3847202','10116333','10813936','10473308','8994234','OC321845',
  '11523515','7075183','9010597','11041325','9805175','12336828','11924643','9688709','SC619434','10220212','3864068','10499190','7383076',
  '8706503','11771128','4467860','11218066','4384008','8318444','123550','7622119','9618109','10611481','6894120','8100687','3280557',
  '4036416','6841897','11769589','7875732','8943369','9892057','1800000','10546847','4156317','9467768','8778322','5528381','10902884',
  '4978912','OC415130','10185006','9158610','12209449','9319771','2142875','6936153','3919664','8344447','3235601','8961638','4097099',
  '12420613','4498663','8444296','10917030','7094561','11121433','11207381','5243851','8848940','11476842','9932290','11375584','10915172',
  '12586871','3847379','7040707','9714903','7866563','3102360','10045407','9459339'
];

var layerNames = {
  'local-authorities': 'Local Authorities',
  'final-areas': 'Final Areas',
  'scaleup-density': 'Scaleup density per 100k (2022)',
  'avg-growth': 'Avg growth in scaleup density (2013-2022)'
};

var areaColors = {
  'Buckinghamshire': '#d0f0c0',                  // Light green
  'Cambridgeshire and Peterborough': '#a2d9b1',
  'Cheshire and Warrington': '#75c2a3',
  'Cornwall and Isles of Scilly': '#4aab94',
  'Cumbria': '#1d9486',
  'Devon': '#007d77',                            // Medium teal
  'Dorset': '#006e6a',
  'East Midlands CCA': '#005f5e',
  'East Sussex': '#004f51',
  'Essex': '#003f45',                            // Dark teal
  'Gloucestershire': '#cce5ff',                  // Light blue
  'Greater Lincolnshire': '#99ccff',
  'Greater Manchester CA': '#66b2ff',
  'Hampshire area': '#3399ff',
  'Hertfordshire': '#0080ff',
  'Hull and East Yorkshire': '#0066cc',
  'Kent': '#0059b3',
  'Lancashire': '#004d99',
  'Leicester and Leicestershire': '#004080',
  'Liverpool City Region CA': '#003366',         // Dark blue
  'London': '#00264d',
  'New Anglia': '#001a33',
  'North East CA': '#00111f',
  'Oxfordshire': '#000d17',
  'Solent': '#d0f0c0',                           // Repeat colors if needed
  'The Marches': '#a2d9b1',
  'Somerset': '#75c2a3',
  'South East Midlands': '#4aab94',
  'South Yorkshire CA': '#1d9486',
  'Stoke-on-Trent and Staffordshire': '#007d77',
  'Surrey': '#006e6a',
  'Swindon and Wiltshire': '#005f5e',
  'Tees Valley CA': '#004f51',
  'Thames Valley Berkshire': '#003f45',
  'Warwickshire': '#cce5ff',
  'West Midlands CA': '#99ccff',
  'West of England CA': '#66b2ff',
  'Coast to Capital': '#3399ff',
  'West Yorkshire CA': '#0080ff',
  'Worcestershire': '#0066cc',
  'York and North Yorkshire CA': '#0059b3',
  'Northern Ireland': '#004d99',
  'Scotland': '#004080',
  'Wales': '#003366'
};

// Define color scales for scaleup data columns
var scaleupColorScales = {
  'Scaleup density per 100k (2022)': chroma.scale(['#eff3ff', '#084594']).classes(5),
  'Avg growth in scaleup density (2013-2022)': chroma.scale(['#fee5d9', '#a50f15']).classes(5)
};

// List of sectors and corresponding CSV files
var sectors = {
  'Advanced Manufacturing': 'Adv_man_clusters10.csv',
  'Agritech': 'Agritech_clusters7.csv',
  'Creative Industries': 'Creative_Industries_clusters15.csv',
  'Fintech': 'Fintech_clusters12.csv',
  'Net Zero': 'NetZero_clusters20.csv',
  'Professional Services': 'Prof_Services_clusters25.csv',
  'Technology': 'Techs_clusters35.csv',
  'Telecoms Technology': 'TelecomsTechs_clusters15.csv',
  'Life Sciences': 'LifeSciences_clusters20.csv'
};

var summaryStatsFiles = {
  'Advanced Manufacturing': 'summarystats_Adv_man.csv',
  'Agritech': 'summarystats_Agritech.csv',
  'Creative Industries': 'summarystats_Creative_Industries.csv',
  'Fintech': 'summarystats_Fintech.csv',
  'Net Zero': 'summarystats_NetZero.csv',
  'Life Sciences': 'summarystats_Life_Sciences.csv',
  'Professional Services': 'summarystats_Prof_Services.csv',
  'Technology': 'summarystats_Tech.csv',
  'Telecoms Technology': 'summarystats_Telecoms.csv'
};

var financialDataFiles = {
  'Advanced Manufacturing': 'financials_Adv_man.csv',
  'Agritech': 'financials_Agritech.csv',
  'Creative Industries': 'financials_Creative_Industries.csv',
  'Fintech': 'financials_Fintech.csv',
  'Life Sciences': 'financials_Life_Sciences.csv',
  'Net Zero': 'financials_Net_Zero.csv',
  'Professional Services': 'financials_Prof_Services.csv',
  'Technology': 'financials_Tech.csv',
  'Telecoms Technology': 'financials_Telecoms.csv'
};

// Assign colors to sectors
var sectorColors = {
  'Advanced Manufacturing': 'rgba(255, 0, 0, 0.5)',    // Red with transparency
  'Agritech': '#008080',                              // Teal
  'Creative Industries': '#FF69B4',                   // Bright pink
  'Fintech': '#800000',                               // Maroon
  'Life Sciences': '#800080',                         // Purple
  'Net Zero': '#1646a0',                              // Dark Blue
  'Clean Tech': '#FFB6C1',                            // Dusky pink
  'Professional Services': '#008000',                 // Green
  'Telecoms Technology': '#A9A9A9',                    // Grey
  'Technology': '#FFA500'                              // Orange
};

// Mapping of internal sector names to display names
var sectorDisplayNames = {
  'Telecoms Technology': 'Telecoms',
};

// Initialize the application by loading LAD data
Papa.parse('data/lad_data.csv', {
  download: true,
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  complete: function (results) {
    csvData = results.data;
    loadLocalAuthoritiesLayer();
  },
  error: function (error) {
    console.error('Error parsing LAD CSV:', error);
  }
});

function loadLocalAuthoritiesLayer() {
  fetch('data/uk-regions.geojson')
    .then(response => response.json())
    .then(geojsonData => {
      mergeData(geojsonData);
    })
    .catch(error => console.error('Error loading GeoJSON:', error));
}

function mergeData(geojsonData) {
  var csvDataLookup = {};
  csvData.forEach(function (row) {
    var ladCode = row.LAD23CD ? row.LAD23CD.trim().toUpperCase() : null;
    if (ladCode) {
      if (row['Final area']) {
        row['Final area'] = row['Final area'].trim();
      }
      csvDataLookup[ladCode] = row;
    } else {
      console.warn('Missing LAD23CD in CSV row:', row);
    }
  });

  var unknownLADCount = 0;

  geojsonData.features.forEach(function (feature) {
    var ladCode = feature.properties.LAD23CD ? feature.properties.LAD23CD.trim().toUpperCase() : null;
    if (ladCode && csvDataLookup[ladCode]) {
      feature.properties = {
        ...feature.properties,
        ...csvDataLookup[ladCode],
        lad: csvDataLookup[ladCode].lad || feature.properties.LAD23NM || ladCode // Ensure 'lad' property is set
      };
    } else {
      console.warn(`No matching CSV data for LAD code: ${ladCode}`);
      feature.properties.lad = feature.properties.LAD23NM || 'Unknown'; // Assign a default 'lad' value
      unknownLADCount++;
    }
  });

  console.log(`Total features with unknown LAD: ${unknownLADCount}`);

  localAuthoritiesLayer = L.geoJSON(geojsonData, {
    pane: 'polygonsPane',
    style: localAuthoritiesStyle,
    onEachFeature: onEachLocalAuthorityFeature
  });

  loadFinalAreasLayer();
}

function loadFinalAreasLayer() {
  fetch('data/final_areas.geojson')
    .then(response => response.json())
    .then(geojsonData => {
      finalAreasGeoJSONData = geojsonData;
      loadScaleupData();
    })
    .catch(error => console.error('Error loading Final Areas GeoJSON:', error));
}

function loadScaleupData() {
  Papa.parse('data/scaleup_data.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: function (results) {
      scaleupData = results.data;
      processScaleupData();
    },
    error: function (error) {
      console.error('Error parsing scaleup data CSV:', error);
      processScaleupData();
    }
  });
}

function processScaleupData() {
  try {
    var scaleupDataLookup = {};

    scaleupData.forEach(function (row) {
      var areaName = row['LOCAL AREA'] ? row['LOCAL AREA'].trim() : null;
      if (areaName) {
        ['No of Scaleups (2022)', 'Scaleup density per 100k (2022)', 'Avg growth in scaleup density (2013-2022)'].forEach(function (columnName) {
          var value = row[columnName];
          if (typeof value === 'string') {
            value = value.replace(/[^0-9.-]+/g, '');
            value = parseFloat(value);
            if (isNaN(value)) {
              console.warn('Invalid number in scaleup data for area', areaName, 'column', columnName, 'value:', row[columnName]);
              value = null;
            }
            row[columnName] = value;
          } else if (typeof value !== 'number') {
            row[columnName] = null;
          }
        });
        scaleupDataLookup[areaName] = row;
      } else {
        console.warn('Missing LOCAL AREA in scaleup data row:', row);
      }
    });

    finalAreasGeoJSONData.features.forEach(function (feature) {
      var areaName = feature.properties['Final area'];
      if (areaName && scaleupDataLookup[areaName]) {
        feature.properties = {
          ...feature.properties,
          ...scaleupDataLookup[areaName]
        };
      } else {
        console.warn(`No matching scaleup data for area: ${areaName}`);
      }
    });

    finalAreasLayer = L.geoJSON(finalAreasGeoJSONData, {
      pane: 'polygonsPane',
      style: finalAreasStyle,
      onEachFeature: onEachFinalAreaFeature
    });

    createScaleupLayers();

  } catch (error) {
    console.error('Error processing scaleup data:', error);
  } finally {
    finalizeMapSetup();
  }
}

function loadClusterRegions(callback) {
  Papa.parse('data/cluster_regions.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      var data = results.data;
      data.forEach(function (row) {
        var clusterNo = row['CLUSTER No'];
        for (var sector in sectors) {
          if (!clusterRegions[sector]) {
            clusterRegions[sector] = {};
          }
          var region = row[sector];
          if (region) {
            clusterRegions[sector][clusterNo] = region;
          }
        }
      });
      callback();
    },
    error: function (error) {
      console.error('Error parsing cluster regions CSV:', error);
      callback();
    }
  });
}

function addPolygonToggleControl() {
  if (polygonToggleControl) {
    console.log('Display Mode Control already exists.');
    return; // Prevent adding multiple controls
  }

  console.log('Adding Display Mode Control.');

  polygonToggleControl = L.control({ position: 'topright' });
  
  polygonToggleControl.onAdd = function () {
    var div = L.DomUtil.create('div', 'polygon-toggle-control');
    var html = `
      <label>Display Mode:</label><br>
      <select id="display-mode-select">
        <option value="points" ${displayMode === 'points' ? 'selected' : ''}>See Cluster Points</option>
        <option value="polygons" ${displayMode === 'polygons' ? 'selected' : ''}>See Cluster Polygons</option>
        <option value="both" ${displayMode === 'both' ? 'selected' : ''}>See Both Clusters & Polygons</option>
      </select>
    `;
    div.innerHTML = html;

    // Attach event listener within the onAdd method
    var displayModeSelect = div.querySelector('#display-mode-select');
    if (displayModeSelect) {
      console.log('Display mode selector found'); // Debugging log
      displayModeSelect.addEventListener('change', function () {
        displayMode = this.value; // 'points', 'polygons', or 'both'
        console.log('Display mode changed to:', displayMode); // Debugging log
        updateClusterLayers();
      });
    } else {
      console.error('Display mode select element not found.');
    }

    // Disable click events from propagating to the map
    L.DomEvent.disableClickPropagation(div);

    return div;
  };

  polygonToggleControl.addTo(map);
}

function finalizeMapSetup() {
  console.log('finalizeMapSetup called'); // Debugging log
  updateSearchControl('');
  updateLegend(''); // Initialize the search control
  addLegend();
}

document.querySelectorAll('#layer-selection input[type=checkbox]').forEach(function (checkbox) {
  checkbox.addEventListener('change', function () {
    var sectorCheckboxes = document.querySelectorAll('.sector-checkbox');
    if (this.checked) {
      // Deselect and uncheck all sectors
      sectorCheckboxes.forEach(function (sectorCheckbox) {
        if (sectorCheckbox.checked) {
          sectorCheckbox.checked = false;
        }
      });
      currentSectors = [];
      removeClusterLayers();
      document.getElementById('overall-stats-button').style.display = 'none';

      // Add the selected map layer
      switch (this.id) {
        case 'local-authorities':
          map.addLayer(localAuthoritiesLayer);
          break;
        case 'final-areas':
          map.addLayer(finalAreasLayer);
          break;
        case 'scaleup-density':
          map.addLayer(scaleupLayers['Scaleup density per 100k (2022)']);
          break;
        case 'avg-growth':
          map.addLayer(scaleupLayers['Avg growth in scaleup density (2013-2022)']);
          break;
        default:
          console.warn('Unknown layer:', this.id);
      }

      // Uncheck other map layers
      document.querySelectorAll('#layer-selection input[type=checkbox]').forEach(function (cb) {
        if (cb !== checkbox && cb.checked) {
          cb.checked = false;
          // Remove their layers from the map
          switch (cb.id) {
            case 'local-authorities':
              if (map.hasLayer(localAuthoritiesLayer)) {
                map.removeLayer(localAuthoritiesLayer);
              }
              break;
            case 'final-areas':
              if (map.hasLayer(finalAreasLayer)) {
                map.removeLayer(finalAreasLayer);
              }
              break;
            case 'scaleup-density':
              if (map.hasLayer(scaleupLayers['Scaleup density per 100k (2022)'])) {
                map.removeLayer(scaleupLayers['Scaleup density per 100k (2022)']);
              }
              break;
            case 'avg-growth':
              if (map.hasLayer(scaleupLayers['Avg growth in scaleup density (2013-2022)'])) {
                map.removeLayer(scaleupLayers['Avg growth in scaleup density (2013-2022)']);
              }
              break;
            default:
              console.warn('Unknown layer:', cb.id);
          }
        }
      });

      // Update the legend and search control
      var layerName = layerNames[this.id];
      updateLegend(layerName);
      updateSearchControl(layerName);
    } else {
      // Layer is unchecked
      // Remove the layer from the map
      switch (this.id) {
        case 'local-authorities':
          if (map.hasLayer(localAuthoritiesLayer)) {
            map.removeLayer(localAuthoritiesLayer);
          }
          break;
        case 'final-areas':
          if (map.hasLayer(finalAreasLayer)) {
            map.removeLayer(finalAreasLayer);
          }
          break;
        case 'scaleup-density':
          if (map.hasLayer(scaleupLayers['Scaleup density per 100k (2022)'])) {
            map.removeLayer(scaleupLayers['Scaleup density per 100k (2022)']);
          }
          break;
        case 'avg-growth':
          if (map.hasLayer(scaleupLayers['Avg growth in scaleup density (2013-2022)'])) {
            map.removeLayer(scaleupLayers['Avg growth in scaleup density (2013-2022)']);
          }
          break;
        default:
          console.warn('Unknown layer:', this.id);
      }

      // Hide the legend and search control
      updateLegend('');
      updateSearchControl('');
    }
  });
});


function localAuthoritiesStyle(feature) {
  return {
    fillColor: getColor(feature.properties['Final area']),
    weight: 0.5,
    color: '#333',
    fillOpacity: 0.8,
    interactive: true
  };
}

function finalAreasStyle(feature) {
  return {
    fillColor: getColor(feature.properties['Final area']),
    weight: 1,
    color: '#000',
    fillOpacity: 0.7,
    interactive: true
  };
}

function getColor(area) {
  return areaColors[area] || '#FFFFFF';
}

function getClusterColor(clusterId) {
  var clusterNumber = clusterId.split('_')[1];
  if (clusterNumber === '0') {
    return '#D3D3D3'; // Light grey for Cluster 0
  }
  return clusterColors[clusterId];
}

function getScaleupDensityColor(value) {
  if (value < 40) {
    return '#00008B';
  } else if (value >= 40 && value < 45) {
    return '#4169E1';
  } else if (value >= 45 && value < 50) {
    return '#87CEFA';
  } else if (value >= 50 && value <= 60) {
    return '#7FFFD4';
  } else if (value > 60) {
    return '#006400';
  } else {
    return '#FFFFFF';
  }
}

function getAvgGrowthColor(value) {
  if (value < 0) {
    return '#00008B'; // Dark blue
  } else if (value >= 0 && value < 1) {
    return '#87CEFA'; // Light blue
  } else if (value >= 1 && value <= 2) {
    return '#20B2AA'; // Light blue-green (teal)
  } else if (value > 2) {
    return '#006400'; // Dark green
  } else {
    return '#FFFFFF'; // Default color for invalid or missing data
  }
}

function getScaleupColor(value, columnName) {
  if (columnName === 'Scaleup density per 100k (2022)') {
    return getScaleupDensityColor(value);
  } else if (columnName === 'Avg growth in scaleup density (2013-2022)') {
    return getAvgGrowthColor(value);
  } else {
    var scale = scaleupColorScales[columnName];
    if (!scale) {
      console.error('No color scale found for column:', columnName);
      return '#FFFFFF';
    }

    var min = getMinValue(columnName);
    var max = getMaxValue(columnName);

    if (isNaN(min) || isNaN(max) || min === max) {
      console.error('Invalid min or max value for column:', columnName, 'Min:', min, 'Max:', max);
      return '#FFFFFF';
    }

    scale.domain([min, max]);

    if (typeof value === 'number' && !isNaN(value)) {
      return scale(value).hex();
    } else {
      return '#FFFFFF';
    }
  }
}

function getMinValue(columnName) {
  var values = scaleupData.map(row => row[columnName]).filter(v => typeof v === 'number' && !isNaN(v));
  if (values.length === 0) {
    console.error('No valid numeric values found for column:', columnName);
    return 0;
  }
  return Math.min(...values);
}

function getMaxValue(columnName) {
  var values = scaleupData.map(row => row[columnName]).filter(v => typeof v === 'number' && !isNaN(v));
  if (values.length === 0) {
    console.error('No valid numeric values found for column:', columnName);
    return 1;
  }
  return Math.max(...values);
}

function onEachLocalAuthorityFeature(feature, layer) {
  var props = feature.properties;

  layer.layerSource = 'Local Authorities';

  var popupContent = `
    <div class="popup-content">
      <h3>${props.lad || props.LAD23NM}</h3>
      <p><strong>Final Area:</strong> ${props['Final area'] || 'N/A'}</p>
    </div>
  `;

  layer.bindPopup(popupContent);

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });
}

function onEachFinalAreaFeature(feature, layer) {
  var props = feature.properties;

  layer.layerSource = 'Final Areas';

  var popupContent = `
    <div class="popup-content">
      <h3>${props['Final area']}</h3>
    </div>
  `;

  layer.bindPopup(popupContent);

  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });
}

// Define a highlight style
function highlightPolygon(polygon) {
  polygon.setStyle({
    weight: 3,
    color: '#999894',       // Grey border for highlight
    fillOpacity: 0.5        // Increased fill opacity for visibility
  });

  // Bring the highlighted polygon to the front
  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    polygon.bringToFront();
  }
}

// Define a function to reset polygon style to default
function resetPolygonStyle(polygon) {
  polygon.setStyle({
    weight: polygon.originalStyle.weight,
    color: polygon.originalStyle.color,
    fillOpacity: polygon.originalStyle.fillOpacity
  });
}

function highlightFeature(e) {
  var layer = e.target;

  layer.setStyle({
    weight: 3,
    color: '#666',
    fillOpacity: 0.9
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
}

function resetHighlight(e) {
  var layer = e.target;

  if (layer.layerSource) {
    var layerSource = layer.layerSource;

    if (layerSource === 'Local Authorities' && localAuthoritiesLayer) {
      localAuthoritiesLayer.resetStyle(layer);
    } else if (layerSource === 'Final Areas' && finalAreasLayer) {
      finalAreasLayer.resetStyle(layer);
    } else if (scaleupLayers[layerSource]) {
      scaleupLayers[layerSource].resetStyle(layer);
    }
  }
}

function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
}

function createScaleupLayers() {
  ['Scaleup density per 100k (2022)', 'Avg growth in scaleup density (2013-2022)'].forEach(function (columnName) {
    var geojsonFeatures = JSON.parse(JSON.stringify(finalAreasGeoJSONData));

    scaleupLayers[columnName] = L.geoJSON(geojsonFeatures, {
      pane: 'polygonsPane',
      style: scaleupStyleFactory(columnName),
      onEachFeature: onEachScaleupFeatureFactory(columnName)
    });
  });
}

function scaleupStyleFactory(columnName) {
  return function (feature) {
    var value = feature.properties[columnName];
    return {
      fillColor: getScaleupColor(value, columnName),
      weight: 1,
      color: '#000',
      fillOpacity: 0.7,
      interactive: true
    };
  };
}

function onEachScaleupFeatureFactory(columnName) {
  return function (feature, layer) {
    var props = feature.properties;
    var value = props[columnName] !== undefined ? props[columnName] : 'No data';
    var noOfScaleups = props['No of Scaleups (2022)'] !== undefined ? props['No of Scaleups (2022)'] : 'No data';

    layer.layerSource = columnName;

    var popupContent = `
      <div class="popup-content">
        <h3>${props['Final area']}</h3>
        <p><strong>${columnName}:</strong> ${value}</p>
        <p><strong>No of Scaleups (2022):</strong> ${noOfScaleups}</p>
      </div>
    `;

    layer.bindPopup(popupContent);

    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: zoomToFeature
    });
  };
}

//function addLayerControl() {
 /* var overlays = {
    'Local Authorities': localAuthoritiesLayer,
    'Final Areas': finalAreasLayer,
    'Scaleup density per 100k (2022)': scaleupLayers['Scaleup density per 100k (2022)'],
    'Avg growth in scaleup density (2013-2022)': scaleupLayers['Avg growth in scaleup density (2013-2022)']
  };

  if (layerControl) {
    map.removeControl(layerControl);
  }

  layerControl = L.control.layers({}, overlays, { collapsed: false }).addTo(map);

  map.on('overlayadd', function (e) {
    removeClusterLayers();
    var layerName = getLayerName(e.layer);
    updateLegend(layerName);
    updateSearchControl(layerName);
  });

  map.on('overlayremove', function (e) {
    var layerName = getLayerName(e.layer);
    updateLegend('');
    updateSearchControl('');
  });

  function getLayerName(layer) {
    for (var name in overlays) {
      if (overlays[name] === layer) {
        return name;
      }
    }
    return '';
  }
}
*/
function addLegend() {
  if (legend) {
    map.removeControl(legend);
  }

  legend = L.control({ position: 'bottomleft' });

  legend.onAdd = function () {
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = `
      <div class="legend-header">
        <span><strong>Legend</strong></span>
        <button id="legend-toggle">Hide</button>
      </div>
      <div id="legend-content">
        <!-- Legend entries will be inserted here -->
      </div>
    `;
    this._div = div;
    this.update('');
    return this._div;
  };

  legend.update = function (layerName) {
    var contentDiv = this._div.querySelector('#legend-content');
    var legendContainer = this._div;

    if (layerName === 'Scaleup density per 100k (2022)') {
      legendContainer.style.display = 'block';
      contentDiv.innerHTML = '';
      contentDiv.innerHTML += `<strong>${layerName}</strong><br>`;
      var labels = [];

      labels.push(
        '<i style="background:#006400"></i> Greater than 60'
      );
      labels.push(
        '<i style="background:#7FFFD4"></i> 50 - 60'
      );
      labels.push(
        '<i style="background:#87CEFA"></i> 45 - 50'
      );
      labels.push(
        '<i style="background:#4169E1"></i> 40 - 45'
      );
      labels.push(
        '<i style="background:#00008B"></i> Fewer than 40'
      );

      contentDiv.innerHTML += labels.join('<br>');
    } else if (layerName === 'Avg growth in scaleup density (2013-2022)') {
      legendContainer.style.display = 'block';
      contentDiv.innerHTML = '';
      contentDiv.innerHTML += `<strong>${layerName}</strong><br>`;
      var labels = [];
    
      labels.push(
        '<i style="background:#006400"></i> Greater than 2'
      );
      labels.push(
        '<i style="background:#20B2AA"></i> 1 - 2'
      );
      labels.push(
        '<i style="background:#87CEFA"></i> 0 - 1'
      );
      labels.push(
        '<i style="background:#00008B"></i> Fewer than 0'
      );
    
      contentDiv.innerHTML += labels.join('<br>');
    } else if (layerName === 'Sectors' && currentSectors.length > 0) {
      // Show the legend
      legendContainer.style.display = 'block';
      contentDiv.innerHTML = '';
      contentDiv.innerHTML += '<strong>Sectors</strong><br>';
  
      // Loop through currentSectors to build legend entries
      currentSectors.forEach(function (sector) {
          var color = sectorColors[sector] || '#FFFFFF';
          var displayName = sectorDisplayNames[sector] || sector; // Use display name if available
          contentDiv.innerHTML +=
              '<i style="background:' + color + '"></i> ' +
              displayName + '<br>';
      });
  }
   else {
      legendContainer.style.display = 'none';
      contentDiv.innerHTML = '';
    }
  };

  legend.addTo(map);

  map.whenReady(function () {
    var toggleButton = document.getElementById('legend-toggle');
    var legendContent = document.getElementById('legend-content');

    if (toggleButton) {
      toggleButton.onclick = function () {
        if (legendContent.style.display === 'none') {
          legendContent.style.display = 'block';
          toggleButton.textContent = 'Hide';
        } else {
          legendContent.style.display = 'none';
          toggleButton.textContent = 'Show';
        }
      };
    } else {
      console.error('legend-toggle button not found.');
    }
  });
}


function updateLegend(activeLayerName) {
  if (legend) {
    legend.update(activeLayerName);
  }
}


function formatTurnover(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }

  // Determine the appropriate notation
  if (value >= 1e9) {
    // Value is in billions
    return '£' + (value / 1e9).toFixed(1) + 'B';
  } else if (value >= 1e6) {
    // Value is in millions
    return '£' + (value / 1e6).toFixed(1) + 'M';
  } else if (value >= 1e3) {
    // Value is in thousands
    return '£' + (value / 1e3).toFixed(1) + 'K';
  } else {
    // Value is less than a thousand
    return '£' + value.toFixed(0);
  }
}

function updateLegendForClusters() {
}

function getClusterNameById(clusterId) {
  var company = companyData.find(function (comp) {
    return comp.clusterId === clusterId;
  });
  if (company) {
    return company.Cluster_name + ' (Cluster ' + company.cluster + ')';
  }
  return clusterId;
}

// Handle "Overall Stats" Button Click
document.getElementById('overall-stats-button').addEventListener('click', function (e) {
  e.preventDefault();
  if (currentSectors.length > 0) {
    showSectorStatistics(currentSectors);
  } else {
    alert('Please select at least one sector to view statistics.');
  }
});

function addSearchControl() {
  // Remove existing search control if any
  if (searchControl) {
    map.removeControl(searchControl);
  }

  // Define the search control
  searchControl = new L.Control.Search({
    layer: localAuthoritiesLayer || finalAreasLayer,
    propertyName: localAuthoritiesLayer ? 'lad' : 'Final area', // Use 'lad' for Local Authorities, otherwise 'Final area'
    marker: false,
    initial: false,
    zoom: 12,
    title: 'Search for Area',
    moveToLocation: function (latlng) {
      map.fitBounds(latlng.layer.getBounds());
      highlightFeature({ target: latlng.layer });
    }
  });

  searchControl.on('search:locationfound', function(e) {
    e.layer.openPopup();
  });

  map.addControl(searchControl);
}

var searchControl;

function updateSearchControl(activeLayerName) {
  if (searchControl) {
    map.removeControl(searchControl);
    searchControl = null;
  }

  var searchLayer;
  var propertyName;

  if (activeLayerName === 'Local Authorities' && localAuthoritiesLayer) {
    searchLayer = localAuthoritiesLayer;
    propertyName = 'lad' || 'LAD23NM'; // Adjust based on your data
  } else if (activeLayerName === 'Final Areas' && finalAreasLayer) {
    searchLayer = finalAreasLayer;
    propertyName = 'Final area';
  } else if (activeLayerName === 'Scaleup density per 100k (2022)' && scaleupLayers['Scaleup density per 100k (2022)']) {
    searchLayer = scaleupLayers['Scaleup density per 100k (2022)'];
    propertyName = 'Final area';
  } else if (activeLayerName === 'Avg growth in scaleup density (2013-2022)' && scaleupLayers['Avg growth in scaleup density (2013-2022)']) {
    searchLayer = scaleupLayers['Avg growth in scaleup density (2013-2022)'];
    propertyName = 'Final area';
  } else {
    // No search control for this layer
    return;
  }

  searchControl = new L.Control.Search({
    layer: searchLayer,
    propertyName: propertyName,
    marker: false,
    initial: false,
    zoom: 12,
    title: 'Search',
    moveToLocation: function (latlng) {
      map.fitBounds(latlng.layer.getBounds());
      highlightFeature({ target: latlng.layer });
    }
  });

  searchControl.on('search:locationfound', function(e) {
    e.layer.openPopup();
  });

  searchControl.addTo(map);
}

// Function to parse numbers and handle strings with commas or symbols
function parseNumber(value) {
  if (typeof value === 'string') {
    value = value.replace(/[^0-9.-]+/g, ''); // Remove non-numeric characters
  }
  var parsedValue = parseFloat(value);
  return isNaN(parsedValue) ? 0 : parsedValue;
}

loadClusterRegions(function () {
  // Now clusterRegions is loaded, proceed to populate sector checkboxes
  populateSectorCheckboxes();
});

function loadSectorsData(sectorsList) {
  if (sectorsList.length === 0) {
    // No sectors selected, clear data and remove layers
    companyData = [];
    clusterSummaryData = {};
    removeClusterLayers();
    updateLegend('');
    document.getElementById('overall-stats-button').style.display = 'none';
    return;
  }
  var promises = sectorsList.map(function (sector) {
    var clusterFile = sectors[sector];
    var summaryFile = summaryStatsFiles[sector];
    var financialFile = financialDataFiles[sector];
    return new Promise(function (resolve, reject) {
      // Load the cluster data
      Papa.parse('data/' + clusterFile, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function (clusterResults) {
          var clusterData = clusterResults.data.filter(function (company) {
            return company && company.Latitude && company.Longitude;
          });
          // Load the summary statistics data
          Papa.parse('data/' + summaryFile, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function (summaryResults) {
              // Load the financial data
              Papa.parse('data/' + financialFile, {
                download: true,
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function (financialResults) {
                  resolve({
                    sector: sector,
                    clusterData: clusterData,
                    summaryData: summaryResults.data,
                    financialData: financialResults.data
                  });
                },
                error: function (error) {
                  console.error('Error parsing financial CSV for sector ' + sector + ':', error);
                  resolve({
                    sector: sector,
                    clusterData: clusterData,
                    summaryData: summaryResults.data,
                    financialData: []
                  });
                }
              });
            },
            error: function (error) {
              console.error('Error parsing summary statistics CSV for sector ' + sector + ':', error);
              resolve({ sector: sector, clusterData: clusterData, summaryData: [], financialData: [] });
            }
          });
        },
        error: function (error) {
          console.error('Error parsing company clusters CSV for sector ' + sector + ':', error);
          resolve({ sector: sector, clusterData: [], summaryData: [], financialData: [] });
        }
      });
    });
  });

  Promise.all(promises).then(function (sectorDataArray) {
    companyData = [];
    clusterSummaryData = {}; // Holds cluster-level summary data

    sectorDataArray.forEach(function (sectorData) {
      var sector = sectorData.sector;
      var financialDataMap = {};

      // Create a mapping from Companynumber to financial data
      sectorData.financialData.forEach(function (financialRecord) {
        var companyNumber = financialRecord.Companynumber;
        financialDataMap[companyNumber] = financialRecord;
      });

      // Process cluster data and merge financial data
      sectorData.clusterData.forEach(function (company) {
        company.sector = sector;
        company.cluster = (company.cluster !== undefined && company.cluster !== null) ? company.cluster.toString() : '0';
        company.clusterId = sector + '_' + company.cluster;

        var companyNumber = company.Companynumber;
        var financialRecord = financialDataMap[companyNumber];

        if (financialRecord) {
          // Merge financial data into company object
          company.Companyname = financialRecord.Companyname;
          company.BestEstimateGrowthPercentagePerYear = parseFloat(financialRecord.BestEstimateGrowthPercentagePerYear);
          company.TotalInnovateUKFunding = parseFloat(financialRecord.TotalInnovateUKFunding);
          company.WomenFounded = parseInt(financialRecord.WomenFounded); // Parse as integer (0 or 1)
          company.total_employees = parseNumber(financialRecord.TotalEmployees);
          company.total_turnover = parseNumber(financialRecord.TotalTurnover);
        } else {
          // Handle companies without financial data
          company.Companyname = 'Unknown';
          company.BestEstimateGrowthPercentagePerYear = null;
          company.TotalInnovateUKFunding = null;
          company.WomenFounded = null;
          company.total_employees = 0;
          company.total_turnover = 0;
        }
      });

      companyData = companyData.concat(sectorData.clusterData);

      // Process summary data for clusters
      sectorData.summaryData.forEach(function (summary) {
        var clusterId = sector + '_' + summary.cluster.toString();
        clusterSummaryData[clusterId] = summary;
        clusterSummaryData[clusterId].sector = sector;
      });
    });

    companyData = companyData.filter(function(company) {
      var companyNumber = company.Companynumber.toString().trim();
      return !excludedCompanyNumbers.includes(companyNumber);
    });

    generateClusterColors();
    populateClusterCheckboxes(); // Updated function
    currentClusters = getAllClusterIds().filter(clusterId => currentSectors.includes(clusterId.split('_')[0]));
    addCompanyClusters();
    // Compute overall statistics for each sector
    computeSectorStatistics();
    if (currentSectors.length > 0) {
      updateLegend('Sectors');
    } else {
      updateLegend('');
    }
  });
}

// Select All Clusters
document.getElementById('select-all-clusters').addEventListener('click', function() {
  var clusterCheckboxes = document.querySelectorAll('.cluster-checkbox');
  clusterCheckboxes.forEach(function(checkbox) {
    checkbox.checked = true;
  });
  currentClusters = Array.from(clusterCheckboxes).map(cb => cb.value);
  updateClusterLayers();
});

// Deselect All Clusters
document.getElementById('deselect-all-clusters').addEventListener('click', function() {
  var clusterCheckboxes = document.querySelectorAll('.cluster-checkbox');
  clusterCheckboxes.forEach(function(checkbox) {
    checkbox.checked = false;
  });
  currentClusters = [];
  updateClusterLayers();
});


function computeSectorStatistics() {
  // Initialize the sectorStats object
  sectorStats = {};

  companyData.forEach(function(company) {
    var sector = company.sector;
    if (!sectorStats[sector]) {
      sectorStats[sector] = {
        companyCount: 0,
        totalEmployees: 0,
        totalTurnover: 0,
        totalGrowthRate: 0,
        validGrowthRateCount: 0, // Ensure this line exists
        totalIUKFunding: 0,
        femaleFoundedCount: 0,
        totalInvestment: 0
      };
    }
    sectorStats[sector].companyCount += 1;

    // Aggregate statistics
    var growthRate = parseFloat(company.BestEstimateGrowthPercentagePerYear);
    if (!isNaN(growthRate)) {
      sectorStats[sector].totalGrowthRate += growthRate;
      sectorStats[sector].validGrowthRateCount += 1; // Increment if valid
    }

    var iukFunding = parseFloat(company.TotalInnovateUKFunding);
    sectorStats[sector].totalIUKFunding += isNaN(iukFunding) ? 0 : iukFunding;

    if (company.WomenFounded === 1) {
      sectorStats[sector].femaleFoundedCount += 1;
    }
  });

  // Integrate 'Total Employees', 'Total Turnover', and 'Total Investment' from clusterSummaryData
  for (var sector in sectorStats) {
    var totalEmployees = 0;
    var totalTurnover = 0;
    var companyCount = 0;

    for (var clusterId in clusterSummaryData) {
      if (clusterSummaryData[clusterId].sector === sector) {
        totalEmployees += parseFloat(clusterSummaryData[clusterId].total_employees) || 0;
        totalTurnover += parseFloat(clusterSummaryData[clusterId].total_turnover) || 0;
        companyCount += parseInt(clusterSummaryData[clusterId].companycount) || 0;

        // Aggregate 'total_Dealroom_PE' as 'Total Investment'
        var dealroomPE = parseFloat(clusterSummaryData[clusterId].total_Dealroom_PE);
        sectorStats[sector].totalInvestment += isNaN(dealroomPE) ? 0 : dealroomPE;
      }
    }

    sectorStats[sector].totalEmployees = totalEmployees;
    sectorStats[sector].totalTurnover = totalTurnover;

    // Calculate average growth rate and female-founded percentage
    var validGrowthRateCount = sectorStats[sector].validGrowthRateCount;
    sectorStats[sector].averageGrowthRate =
      validGrowthRateCount > 0 ? sectorStats[sector].totalGrowthRate / validGrowthRateCount : 0;
    sectorStats[sector].femaleFoundedPercentage =
      sectorStats[sector].companyCount > 0
        ? (sectorStats[sector].femaleFoundedCount / sectorStats[sector].companyCount) * 100
        : 0;
  }
}

function showSectorStatistics(selectedSectors) {
  var content = '<button id="info-box-close" class="info-box-close">&times;</button>';

  selectedSectors.forEach(function (sector) {
    var stats = sectorStats[sector];
    if (stats) {
      content += `
        <h3>${sector} - Overall Statistics</h3>
        <p><strong>Number of Companies:</strong> ${stats.companyCount}</p>
        <p><strong>Total Employees:</strong> ${Math.round(stats.totalEmployees)}</p>
        <p><strong>Total Turnover:</strong> ${formatTurnover(stats.totalTurnover)}</p>
        <p><strong>Average Growth Rate:</strong> ${(stats.averageGrowthRate * 100).toFixed(2)}%</p>
        <p><strong>% Female-Founded Companies:</strong> ${stats.femaleFoundedPercentage.toFixed(2)}%</p>
        <p><strong>Total IUK Grant Funding:</strong> ${formatTurnover(stats.totalIUKFunding)}</p>
        <p><strong>Total Investment:</strong> ${formatTurnover(stats.totalInvestment)}</p>
      `;
    } else {
      content += `<p>No statistics available for sector: ${sector}</p>`;
    }
  });

  var infoBox = document.getElementById('info-box');
  if (infoBox) {
    infoBox.innerHTML = content;
    infoBox.classList.remove('hidden');

    // Ensure the info box has the appropriate CSS classes
    infoBox.classList.add('info-box');

    // Add event listener for close button
    var closeButton = document.getElementById('info-box-close');
    if (closeButton) {
      closeButton.addEventListener('click', function (e) {
        infoBox.classList.add('hidden');
        e.stopPropagation(); // Prevent the click from propagating to parent elements
      });
    } else {
      console.error('Close button not found in info box');
    }
  } else {
    console.error('Info box element not found');
  }
}

function removeClusterLayers() {
  for (var clusterId in clusterLayers) {
    map.removeLayer(clusterLayers[clusterId]);
  }
  clusterLayers = {};
  clusterColors = {};
  currentClusters = [];
  if (clusterControl) {
    map.removeControl(clusterControl);
  }
  // Remove sector polygons
  for (var sector in sectorPolygonLayers) {
    map.removeLayer(sectorPolygonLayers[sector]);
  }
  sectorPolygonLayers = {};

  // Reset display mode if needed
  if (polygonToggleControl) {
    map.removeControl(polygonToggleControl);
    polygonToggleControl = null;
    displayMode = 'both'; // Reset to default
    console.log('Display Mode Control removed during cluster removal.');
  }
}


function removeOtherLayers() {
  if (localAuthoritiesLayer && map.hasLayer(localAuthoritiesLayer)) map.removeLayer(localAuthoritiesLayer);
  if (finalAreasLayer && map.hasLayer(finalAreasLayer)) map.removeLayer(finalAreasLayer);
  for (var key in scaleupLayers) {
    if (map.hasLayer(scaleupLayers[key])) map.removeLayer(scaleupLayers[key]);
  }
  if (searchControl) {
    map.removeControl(searchControl);
  }
}

function addCompanyClusters() {
  updateClusterLayers();
}

var companyClusterLayer = L.geoJSON(null, {
  onEachFeature: function (feature, layer) {
    // Bind popup with company details
    var company = feature.properties;
    var popupContent = `
      <div class="popup-content">
        <p><strong>Company Name:</strong> ${company.Companyname}</p>
        <p><strong>Company Number:</strong> ${company.Companynumber}</p>
        <p><strong>Cluster:</strong> ${company.Cluster_name} (Cluster ${company.cluster})</p>
        <p><strong>Sector:</strong> ${company.sector}</p>
      </div>
    `;
    layer.bindPopup(popupContent);
  }
});

// Function to handle sector selection changes
function handleSectorSelectionChange() {
  // Update the currentSectors array based on checked checkboxes
  currentSectors = Array.from(document.querySelectorAll('.sector-checkbox:checked')).map(cb => cb.value);
  
  var layerCheckboxes = document.querySelectorAll('#layer-selection input[type=checkbox]');
  
  if (currentSectors.length > 0) {
    // Deselect and uncheck all map layers
    layerCheckboxes.forEach(function (layerCheckbox) {
      if (layerCheckbox.checked) {
        layerCheckbox.checked = false;
        // Remove layer from map
        switch (layerCheckbox.id) {
          case 'local-authorities':
            if (map.hasLayer(localAuthoritiesLayer)) {
              map.removeLayer(localAuthoritiesLayer);
            }
            break;
          case 'final-areas':
            if (map.hasLayer(finalAreasLayer)) {
              map.removeLayer(finalAreasLayer);
            }
            break;
          case 'scaleup-density':
            if (map.hasLayer(scaleupLayers['Scaleup density per 100k (2022)'])) {
              map.removeLayer(scaleupLayers['Scaleup density per 100k (2022)']);
            }
            break;
          case 'avg-growth':
            if (map.hasLayer(scaleupLayers['Avg growth in scaleup density (2013-2022)'])) {
              map.removeLayer(scaleupLayers['Avg growth in scaleup density (2013-2022)']);
            }
            break;
          default:
            console.warn('Unknown layer:', layerCheckbox.id);
        }
      }
    });

    // Update legend and search control
    updateLegend(''); // Hide the legend
    updateSearchControl(''); // Remove the search control

    // Load sectors data
    loadSectorsData(currentSectors);
    
    // Show overall stats button
    document.getElementById('overall-stats-button').style.display = 'block';

    // Show the Display Mode Control
    addPolygonToggleControl();
  } else {
    // Enable map layer checkboxes (implementation depends on your specific requirements)
    // For example, re-enable previously selected layers or keep them disabled

    // Clear clusters if no sectors are selected
    currentClusters = [];
    removeClusterLayers();
    
    // Hide overall stats button
    document.getElementById('overall-stats-button').style.display = 'none';
  
    // Hide the legend
    updateLegend('');

    // Remove the Display Mode Control
    if (polygonToggleControl) {
      map.removeControl(polygonToggleControl);
      polygonToggleControl = null;
      displayMode = 'both'; // Reset to default or any desired value
      console.log('Display Mode Control removed.');
      updateClusterLayers(); // Update the map layers based on the new displayMode
    }
  }
}

function populateSectorCheckboxes() {
  var sectorContainer = document.getElementById('sector-checkboxes');
  sectorContainer.innerHTML = ''; // Clear existing checkboxes

  for (var sector in sectors) {
    var displayName = sectorDisplayNames[sector] || sector; // Use display name if available

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'sector-' + sector;
    checkbox.value = sector;
    checkbox.classList.add('sector-checkbox');
    checkbox.checked = false; // Uncheck by default

    var label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = displayName; // Set label to display name

    label.prepend(checkbox);
    sectorContainer.appendChild(label);
  }

  // Attach event listeners to the sector checkboxes
  var sectorCheckboxes = document.querySelectorAll('.sector-checkbox');
  sectorCheckboxes.forEach(function (checkbox) {
    checkbox.addEventListener('change', handleSectorSelectionChange);
  });
}


// Call this function after sectors are loaded
populateSectorCheckboxes();

// Select All Sectors
document.getElementById('select-all-sectors').addEventListener('click', function() {
  var sectorCheckboxes = document.querySelectorAll('.sector-checkbox');
  sectorCheckboxes.forEach(function(checkbox) {
    checkbox.checked = true;
  });
  handleSectorSelectionChange();
});

// Deselect All Sectors
document.getElementById('deselect-all-sectors').addEventListener('click', function() {
  var sectorCheckboxes = document.querySelectorAll('.sector-checkbox');
  sectorCheckboxes.forEach(function(checkbox) {
    checkbox.checked = false;
  });
  handleSectorSelectionChange();
});

function updateClusterLayers() {
  console.log('updateClusterLayers called'); // Debugging log
  console.log('Current displayMode:', displayMode); // Debugging log

  // Clear the global polygons array
  allPolygons = []; // Add this line

  // Remove existing cluster layers
  for (var clusterId in clusterLayers) {
    map.removeLayer(clusterLayers[clusterId]);
  }
  clusterLayers = {};

  if (currentClusters.length === 0) {
    // No clusters selected, so remove legend
    updateLegend(''); // Hide the legend
    return; // No clusters selected
  }

  var clusters = {};
  companyData.forEach(function (company) {
    var clusterId = company.clusterId;
    if (currentClusters.includes(clusterId)) {
      if (!clusters[clusterId]) {
        clusters[clusterId] = [];
      }
      clusters[clusterId].push(company);
    }
  });

  for (var clusterId in clusters) {
    var clusterGroup = L.layerGroup();
    var points = [];

    // Initialize aggregation variables
    var totalGrowthRate = 0;
    var growthRateCount = 0;
    var totalIUKFunding = 0;
    var femaleFoundedCount = 0;
    var totalEmployees = 0;
    var totalTurnover = 0;

    var clusterNumber = clusters[clusterId][0].cluster;
    var sectorName = clusters[clusterId][0].sector;
    var clusterName = clusters[clusterId][0].Cluster_name || 'Cluster ' + clusterNumber;

    // Determine the region
    var region = (clusterRegions[sectorName] && clusterRegions[sectorName][clusterNumber]) || 'Unknown';

    clusters[clusterId].forEach(function (company) {
      var lat = company.Latitude;
      var lng = company.Longitude;
      var companyNumber = company.Companynumber;

      // Collect points for polygon creation
      points.push([lat, lng]);

      // Collect data for aggregation
      var growthRate = company.BestEstimateGrowthPercentagePerYear;
      if (typeof growthRate === 'number' && !isNaN(growthRate)) {
        totalGrowthRate += growthRate;
        growthRateCount++;
      }

      var iukFunding = company.TotalInnovateUKFunding;
      if (typeof iukFunding === 'number' && !isNaN(iukFunding)) {
        totalIUKFunding += iukFunding;
      }

      // Count female-founded companies
      if (company.WomenFounded === 1) {
        femaleFoundedCount++;
      }

      // Show markers if displayMode is 'points' or 'both'
      if (displayMode === 'points' || displayMode === 'both') {
        var marker = L.circleMarker([lat, lng], {
          pane: 'markerPane', // Ensure markers are on top
          radius: 3,
          fillColor: getClusterColor(clusterId),
          color: '#000',
          weight: 0.2,
          fillOpacity: 0.8
        });

        // Update marker popup content to include company name
        marker.bindPopup(`
          <div class="popup-content">
            <p><strong>Company Name:</strong> ${company.Companyname}</p>
            <p><strong>Company Number:</strong> ${companyNumber}</p>
            <p><strong>Cluster:</strong> ${region} (Cluster ${clusterNumber})</p>
            <p><strong>Sector:</strong> ${company.sector}</p>
          </div>
        `);

        marker.on({
          mouseover: function (e) {
            var layer = e.target;
            layer.setStyle({
              radius: 5,
              weight: 1,
              color: '#fff',
              fillOpacity: 1
            });
          },
          mouseout: function (e) {
            var layer = e.target;
            layer.setStyle({
              radius: 3,
              weight: 0.2,
              color: '#000',
              fillOpacity: 0.8
            });
          },
          click: function (e) {
            e.target.openPopup();
          }
        });

        clusterGroup.addLayer(marker);
      }
    });

    // Determine polygon color based on sector
    var polygonColor;
    if (clusterNumber === '0') {
      polygonColor = '#D3D3D3'; // Light grey for Cluster 0
    } else {
      polygonColor = sectorColors[sectorName] || '#FFFFFF';
    }

    // Inside updateClusterLayers, when creating polygons
    if ((displayMode === 'polygons' || displayMode === 'both') && clusterNumber !== '0' && points.length >= 3) {
      var polygon = L.polygon(convexHull(points), {
        pane: 'polygonsPane',
        color: polygonColor,
        fillColor: polygonColor,
        fillOpacity: 0.2,
        weight: 1,
        interactive: false // Set to false to prevent default event capturing
      });

      // Store original style properties
      polygon.originalStyle = {
        color: polygonColor,
        weight: 1,
        fillOpacity: 0.2
      };

      // Retrieve summary data for this cluster
      var summary = clusterSummaryData[clusterId];

      // Calculate aggregated statistics
      var averageGrowthRate = growthRateCount > 0 ? (totalGrowthRate / growthRateCount) : null;
      var femaleFoundedPercentage = clusters[clusterId].length > 0 ? (femaleFoundedCount / clusters[clusterId].length) * 100 : null;

      // Prepare summary info
      var companyCount = summary ? summary.companycount : clusters[clusterId].length;
      var totalEmployees = summary ? Math.round(summary.total_employees) : 'N/A';
      var totalTurnover = summary ? formatTurnover(summary.total_turnover) : 'N/A';
      var averageGrowthRateDisplay = averageGrowthRate !== null ? (averageGrowthRate * 100).toFixed(1) + '%' : 'N/A';
      var femaleFoundedPercentageDisplay = femaleFoundedPercentage !== null ? femaleFoundedPercentage.toFixed(1) + '%' : 'N/A';
      var totalIUKFundingDisplay = totalIUKFunding > 0 ? formatTurnover(totalIUKFunding) : 'N/A';

      // Update polygon popup content to include new aggregated data
      polygon.bindPopup(`
        <div class="popup-content">
          <p><strong>${clusterName}</strong></p>
          <p><strong>Region:</strong> ${region}</p>
          <p><strong>Sector:</strong> ${sectorName}</p>
          <p><strong>Company Count:</strong> ${companyCount}</p>
          <p><strong>Total Employees:</strong> ${totalEmployees}</p>
          <p><strong>Total Turnover:</strong> ${totalTurnover}</p>
          <p><strong>Average Growth Rate:</strong> ${averageGrowthRateDisplay}</p>
          <p><strong>% Female-Founded Companies:</strong> ${femaleFoundedPercentageDisplay}</p>
          <p><strong>Total IUK Grant Funding:</strong> ${totalIUKFundingDisplay}</p>
        </div>
      `);

      // Add the polygon to the cluster group
      clusterGroup.addLayer(polygon);

      // Store the polygon's layer and properties in the allPolygons array
      allPolygons.push({
        layer: polygon,
        properties: {
          clusterNumber: clusterNumber,
          sectorName: sectorName,
          clusterName: clusterName,
          clusterId: clusterId,
          region: region,
          companyCount: companyCount,
          totalEmployees: totalEmployees,
          totalTurnover: totalTurnover,
          averageGrowthRateDisplay: averageGrowthRateDisplay,
          femaleFoundedPercentageDisplay: femaleFoundedPercentageDisplay,
          totalIUKFundingDisplay: totalIUKFundingDisplay
        }
      });
    }

    clusterLayers[clusterId] = clusterGroup;
    clusterGroup.addTo(map);

    
  }

  // After all clusters are added to the map, update the legend
  if (currentSectors.length > 0) {
    updateLegend('Sectors');
  } else {
    updateLegend(''); // Hide the legend when no sectors are selected
  }
}

map.on('mousemove', handleMapMouseMove);
map.on('click', handleMapClick);

function generateClusterColors() {
  clusterColors = {}; // Reset cluster colors

  var clustersInSelectedSectors = companyData.filter(function (company) {
    return currentSectors.includes(company.sector);
  });

  var uniqueClusters = {};

  clustersInSelectedSectors.forEach(function (company) {
    var clusterId = company.clusterId;
    var clusterNumber = company.cluster;

    if (clusterNumber === '0') {
      clusterColors[clusterId] = '#D3D3D3'; // Light grey for Cluster 0
    } else if (!uniqueClusters[clusterId]) {
      uniqueClusters[clusterId] = true;
    }
  });

  var clusterIds = Object.keys(uniqueClusters);
  var numClusters = clusterIds.length;
  var colorScale = chroma.scale('Set1').colors(numClusters > 0 ? numClusters : 1); // Prevent errors if numClusters is 0

  clusterIds.forEach(function (clusterId, index) {
    clusterColors[clusterId] = colorScale[index % colorScale.length];
  });
}

function getAllClusterIds() {
  var clusterIds = companyData.reduce(function (acc, company) {
    var clusterId = company.clusterId;
    if (!acc.includes(clusterId)) {
      acc.push(clusterId);
    }
    return acc;
  }, []);
  return clusterIds;
}

function populateClusterCheckboxes() {
  var clusterContainer = document.getElementById('cluster-checkboxes');
  clusterContainer.innerHTML = ''; // Clear existing checkboxes

  var clusters = getAllClusterIds().filter(clusterId => {
    var sector = clusterId.split('_')[0];
    return currentSectors.includes(sector);
  });

  clusters.forEach(function (clusterId) {
    var cluster = companyData.find(c => c.clusterId === clusterId);
    if (cluster) {
      var sectorDisplayName = sectorDisplayNames[cluster.sector] || cluster.sector;
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'cluster-' + clusterId;
      checkbox.value = clusterId;
      checkbox.classList.add('cluster-checkbox');
      checkbox.checked = true; // Check by default if desired

      var label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = `${cluster.Cluster_name} (Cluster ${cluster.cluster})`; // Keep as is or adjust if needed

      label.prepend(checkbox);
      clusterContainer.appendChild(label);
    }
  });

  // Attach event listeners to the checkboxes
  var clusterCheckboxes = document.querySelectorAll('.cluster-checkbox');
  clusterCheckboxes.forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
      currentClusters = Array.from(document.querySelectorAll('.cluster-checkbox:checked')).map(cb => cb.value);
      updateClusterLayers();
    });
  });
}

populateSectorCheckboxes();


function convexHull(points) {
  if (points.length < 3) {
    return points;
  }
  points = points.slice().sort(function (a, b) {
    return a[0] - b[0] || a[1] - b[1];
  });

  var lower = [];
  for (var i = 0; i < points.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
      lower.pop();
    }
    lower.push(points[i]);
  }

  var upper = [];
  for (var i = points.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
      upper.pop();
    }
    upper.push(points[i]);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function showClusterInfo(clusterInfo) {
  var content = `
    <button id="info-box-close" class="info-box-close">&times;</button>
    <h3>${clusterInfo.clusterName} (Cluster ${clusterInfo.clusterNumber})</h3>
    <p><strong>Sector:</strong> ${clusterInfo.sectorName}</p>
    <p><strong>Company Count:</strong> ${clusterInfo.companyCount}</p>
    <p><strong>Total Employees:</strong> ${clusterInfo.totalEmployees}</p>
    <p><strong>Total Turnover:</strong> ${clusterInfo.totalTurnover}</p>
    <p><strong>Average Growth Rate:</strong> ${clusterInfo.averageGrowthRateDisplay}</p>
    <p><strong>% Female-Founded Companies:</strong> ${clusterInfo.femaleFoundedPercentageDisplay}</p>
    <p><strong>Total IUK Grant Funding:</strong> ${clusterInfo.totalIUKFundingDisplay}</p>
  `;

  var infoBox = document.getElementById('info-box');
  if (infoBox) {
    infoBox.innerHTML = content;
    infoBox.classList.remove('hidden');

    // Disable click events from propagating to the map
    L.DomEvent.disableClickPropagation(infoBox);

    // Add event listener for close button
    var closeButton = document.getElementById('info-box-close');
    if (closeButton) {
      closeButton.addEventListener('click', function (e) {
        infoBox.classList.add('hidden');
        e.stopPropagation(); // Prevent the click from propagating to the map
      });
    } else {
      console.error('Close button not found in info box');
    }
  } else {
    console.error('Info box element not found');
  }
}

function handleMapClick(e) {
  var latlng = e.latlng;
  var polygonsAtPoint = [];

  allPolygons.forEach(function(polygonData) {
    var polygon = polygonData.layer;
    if (isPointInPolygon(latlng, polygon)) {
      // Check if the polygon is already in polygonsAtPoint
      var alreadyAdded = polygonsAtPoint.some(function(pd) {
        return pd.layer._leaflet_id === polygon._leaflet_id;
      });

      if (!alreadyAdded) {
        polygonsAtPoint.push(polygonData);
      }
    }
  });

  if (polygonsAtPoint.length === 0) {
    // Hide info box if no polygons are found
    var infoBox = document.getElementById('info-box');
    if (infoBox) {
      infoBox.classList.add('hidden');
    }
  } else if (polygonsAtPoint.length === 1) {
    // Show info for the single polygon
    showPolygonInfo(polygonsAtPoint[0]);
  } else {
    // Multiple polygons: allow the user to select one
    showPolygonSelectionDialog(polygonsAtPoint);
  }
}

function isPointInPolygon(latlng, polygon) {
  var layerPoint = map.latLngToLayerPoint(latlng);
  var inside = false;
  var parts = polygon._parts;

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var len = part.length;
    for (var j = 0, k = len - 1; j < len; k = j++) {
      var xi = part[j].x,
          yi = part[j].y,
          xj = part[k].x,
          yj = part[k].y,
          intersect = ((yi > layerPoint.y) !== (yj > layerPoint.y)) &&
                      (layerPoint.x < (xj - xi) * (layerPoint.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
  }

  return inside;
}

function showPolygonInfo(polygonData) {
  var props = polygonData.properties;
  var sectorDisplayName = sectorDisplayNames[props.sectorName] || props.sectorName;

  var content = `
    <button id="info-box-close" class="info-box-close">&times;</button>
    <h3>Cluster ${props.clusterNumber}</h3>
    <p><strong>Region:</strong> ${props.region}</p>
    <p><strong>Sector:</strong> ${sectorDisplayName}</p>
    <p><strong>Company Count:</strong> ${props.companyCount}</p>
    <p><strong>Total Employees:</strong> ${props.totalEmployees}</p>
    <p><strong>Total Turnover:</strong> ${props.totalTurnover}</p>
    <p><strong>Average Growth Rate:</strong> ${props.averageGrowthRateDisplay}</p>
    <p><strong>% Female-Founded Companies:</strong> ${props.femaleFoundedPercentageDisplay}</p>
    <p><strong>Total IUK Grant Funding:</strong> ${props.totalIUKFundingDisplay}</p>
  `;

  var infoBox = document.getElementById('info-box');
  if (infoBox) {
    infoBox.innerHTML = content;
    infoBox.classList.remove('hidden');

    // Add event listener for close button
    var closeButton = document.getElementById('info-box-close');
    if (closeButton) {
      closeButton.addEventListener('click', function (e) {
        infoBox.classList.add('hidden');
        e.stopPropagation();
      });
    }
  } else {
    console.error('Info box element not found');
  }
}


function showPolygonSelectionDialog(polygonsData) {
  var content = `
    <button id="info-box-close" class="info-box-close">&times;</button>
    <h3>Select a Cluster</h3>
    <ul>
  `;

  polygonsData.forEach(function (polygonData, index) {
    var props = polygonData.properties;
    content += `
      <li>
        <a href="#" data-index="${index}">${props.clusterName} - Sector: ${props.sectorName}</a>
      </li>
    `;
  });

  content += `</ul>`;

  var infoBox = document.getElementById('info-box');
  if (infoBox) {
    infoBox.innerHTML = content;
    infoBox.classList.remove('hidden');

    // Add event listener for close button
    var closeButton = document.getElementById('info-box-close');
    if (closeButton) {
      closeButton.addEventListener('click', function (e) {
        infoBox.classList.add('hidden');
        e.stopPropagation();
      });
    }

    // Add event listeners for selection links
    var links = infoBox.querySelectorAll('a[data-index]');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var index = parseInt(e.currentTarget.getAttribute('data-index'));
        showPolygonInfo(polygonsData[index]);
      });
    });
  } else {
    console.error('Info box element not found');
  }
}

function handleMapMouseMove(e) {
  var latlng = e.latlng;
  var polygonsAtPoint = [];

  // Reset styles for previously highlighted polygons
  highlightedPolygons.forEach(function(polygon) {
    resetPolygonStyle(polygon);
  });
  highlightedPolygons = [];

  // Loop through all polygons to check if the cursor is over them
  allPolygons.forEach(function(polygonData) {
    var polygon = polygonData.layer;
    if (isPointInPolygon(latlng, polygon)) {
      polygonsAtPoint.push(polygon);
    }
  });

  // Highlight all polygons under the cursor
  polygonsAtPoint.forEach(function(polygon) {
    highlightPolygon(polygon);
    highlightedPolygons.push(polygon);
  });
}

function isPointInPolygon(latlng, polygon) {
  var layerPoint = map.latLngToLayerPoint(latlng);
  var inside = false;
  var parts = polygon._parts;

  if (!parts) {
    return false;
  }

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var len = part.length;
    for (var j = 0, k = len - 1; j < len; k = j++) {
      var xi = part[j].x,
          yi = part[j].y,
          xj = part[k].x,
          yj = part[k].y,
          intersect = ((yi > layerPoint.y) !== (yj > layerPoint.y)) &&
                      (layerPoint.x < (xj - xi) * (layerPoint.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
  }

  return inside;
}

function handleMapClick(e) {
  var latlng = e.latlng;
  var polygonsAtPoint = [];

  allPolygons.forEach(function(polygonData) {
    var polygon = polygonData.layer;
    if (isPointInPolygon(latlng, polygon)) {
      // Prevent duplicates
      var alreadyAdded = polygonsAtPoint.some(function(pd) {
        return pd.layer._leaflet_id === polygon._leaflet_id;
      });

      if (!alreadyAdded) {
        polygonsAtPoint.push(polygonData);
      }
    }
  });

  if (polygonsAtPoint.length === 0) {
    // Close any open popups
    map.closePopup();
  } else if (polygonsAtPoint.length === 1) {
    // Show info for the single polygon in a popup at the clicked location
    showPolygonInfoPopup(polygonsAtPoint[0], latlng);
  } else {
    // Multiple polygons: allow the user to select one via a popup
    showPolygonSelectionPopup(polygonsAtPoint, latlng);
  }
}

function showPolygonInfoPopup(polygonData, latlng) {
  var props = polygonData.properties;
  var sectorDisplayName = sectorDisplayNames[props.sectorName] || props.sectorName;

  var content = `
    <div class="popup-content">
      <h3>Cluster ${props.clusterNumber}</h3>
      <p><strong>Region:</strong> ${props.region}</p>
      <p><strong>Sector:</strong> ${sectorDisplayName}</p>
      <p><strong>Company Count:</strong> ${props.companyCount}</p>
      <p><strong>Total Employees:</strong> ${props.totalEmployees}</p>
      <p><strong>Total Turnover:</strong> ${props.totalTurnover}</p>
      <p><strong>Average Growth Rate:</strong> ${props.averageGrowthRateDisplay}</p>
      <p><strong>% Female-Founded Companies:</strong> ${props.femaleFoundedPercentageDisplay}</p>
      <p><strong>Total IUK Grant Funding:</strong> ${props.totalIUKFundingDisplay}</p>
    </div>
  `;

  L.popup()
    .setLatLng(latlng)
    .setContent(content)
    .openOn(map);
}


function showPolygonSelectionPopup(polygonsData, latlng) {
  var content = document.createElement('div');
  content.className = 'popup-content';

  var tabsContainer = document.createElement('div');
  tabsContainer.className = 'tabs-container';

  var tabLinks = document.createElement('ul');
  tabLinks.className = 'tab-links';

  var tabContentContainer = document.createElement('div');
  tabContentContainer.className = 'tab-content';

  var currentlyHighlightedPolygon = null; // For tracking the highlighted polygon

  polygonsData.forEach(function (polygonData, index) {
    var props = polygonData.properties;
    var sectorDisplayName = sectorDisplayNames[props.sectorName] || props.sectorName;

    // Get the sector color
    var sectorColor = sectorColors[props.sectorName] || '#FFFFFF';

    // Create tab link
    var tabLinkItem = document.createElement('li');
    var tabLink = document.createElement('a');
    tabLink.href = '#';
    tabLink.setAttribute('data-index', index);

    // Only display the cluster number
    tabLink.textContent = `Cluster ${props.clusterNumber}`;

    // Apply the sector color as the background color
    tabLink.style.backgroundColor = sectorColor;

    // Adjust the text color for readability
    var textColor = getContrastColor(sectorColor);
    tabLink.style.color = textColor;

    if (index === 0) {
      tabLinkItem.classList.add('active');
      // Set active tab styles with darker shade
      var darkerColor = chroma(sectorColor).darken(1).hex();
      tabLink.style.backgroundColor = darkerColor;
      tabLink.style.color = getContrastColor(darkerColor);
    }

    tabLinkItem.appendChild(tabLink);
    tabLinks.appendChild(tabLinkItem);

    // Create tab content
    var tabContent = document.createElement('div');
    tabContent.className = 'tab';
    tabContent.setAttribute('data-index', index);
    if (index === 0) {
      tabContent.classList.add('active');
    }

    // Populate tab content with polygon information
    tabContent.innerHTML = `
      <p><strong>Region:</strong> ${props.region}</p>
      <p><strong>Sector:</strong> ${sectorDisplayName}</p>
      <p><strong>Company Count:</strong> ${props.companyCount}</p>
      <p><strong>Total Employees:</strong> ${props.totalEmployees}</p>
      <p><strong>Total Turnover:</strong> ${props.totalTurnover}</p>
      <p><strong>Average Growth Rate:</strong> ${props.averageGrowthRateDisplay}</p>
      <p><strong>% Female-Founded Companies:</strong> ${props.femaleFoundedPercentageDisplay}</p>
      <p><strong>Total IUK Grant Funding:</strong> ${props.totalIUKFundingDisplay}</p>
    `;

    tabContentContainer.appendChild(tabContent);

    // Attach event listener to tab link
    tabLink.addEventListener('click', function (e) {
      e.preventDefault();
      var idx = e.currentTarget.getAttribute('data-index');
      switchTab(idx);
    });
  });

  tabsContainer.appendChild(tabLinks);
  tabsContainer.appendChild(tabContentContainer);
  content.appendChild(tabsContainer);

  var popup = L.popup()
    .setLatLng(latlng)
    .setContent(content)
    .openOn(map);

  function switchTab(index) {
    // Remove 'active' class from all tab links and contents
    var allTabLinks = tabLinks.querySelectorAll('li');
    var allTabContents = tabContentContainer.querySelectorAll('.tab');

    allTabLinks.forEach(function (linkItem) {
      linkItem.classList.remove('active');
      // Reset tab link styles
      var link = linkItem.querySelector('a');
      var sectorColor = sectorColors[polygonsData[link.getAttribute('data-index')].properties.sectorName] || '#FFFFFF';
      link.style.backgroundColor = sectorColor;
      link.style.color = getContrastColor(sectorColor);
    });

    allTabContents.forEach(function (tabContent) {
      tabContent.classList.remove('active');
    });

    // Add 'active' class to the selected tab link and content
    var selectedTabLinkItem = tabLinks.querySelector(`a[data-index="${index}"]`).parentElement;
    selectedTabLinkItem.classList.add('active');

    // Set active tab link styles with darker shade
    var selectedLink = selectedTabLinkItem.querySelector('a');
    var sectorColor = sectorColors[polygonsData[index].properties.sectorName] || '#FFFFFF';
    var darkerColor = chroma(sectorColor).darken(1).hex();
    selectedLink.style.backgroundColor = darkerColor;
    selectedLink.style.color = getContrastColor(darkerColor);

    var selectedTabContent = tabContentContainer.querySelector(`.tab[data-index="${index}"]`);
    selectedTabContent.classList.add('active');

    // Highlight the corresponding polygon
    highlightSelectedPolygon(polygonsData[index].layer);
  }

  function highlightSelectedPolygon(polygon) {
    // Reset previously highlighted polygon
    if (currentlyHighlightedPolygon && currentlyHighlightedPolygon !== polygon) {
      resetPolygonStyle(currentlyHighlightedPolygon);
    }

    // Highlight the selected polygon
    highlightPolygon(polygon);

    // Store the current polygon
    currentlyHighlightedPolygon = polygon;
  }

  // Highlight the first polygon by default
  highlightSelectedPolygon(polygonsData[0].layer);

  // Add event listener for popup close to reset highlighting
  map.on('popupclose', function () {
    if (currentlyHighlightedPolygon) {
      resetPolygonStyle(currentlyHighlightedPolygon);
      currentlyHighlightedPolygon = null;
    }
  });
}

function getContrastColor(hexColor) {
  // Remove '#' if present
  hexColor = hexColor.replace('#', '');

  // Convert short format like 'fff' to 'ffffff'
  if (hexColor.length === 3) {
    hexColor = hexColor.split('').map(function (hex) {
      return hex + hex;
    }).join('');
  }

  var r = parseInt(hexColor.substr(0, 2), 16);
  var g = parseInt(hexColor.substr(2, 2), 16);
  var b = parseInt(hexColor.substr(4, 2), 16);

  // Calculate luminance
  var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Function to adjust the map on window resize
function onWindowResize() {
  map.invalidateSize();
}

// Add the event listener
window.addEventListener('resize', onWindowResize);
