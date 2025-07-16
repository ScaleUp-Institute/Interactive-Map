// Define the UK bounds for larger screens (landscape)
var ukBoundsLandscape = L.latLngBounds(
  L.latLng(49.5, -10.5), // Southwest coordinates
  L.latLng(61.0, 2.1)    // Northeast coordinates
);

// Define base map layers
var lightMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  noWrap: true
});

var darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  noWrap: true
});

// Satellite Map using Esri
var satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri',
  noWrap: true
});

var streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  noWrap: true
});

// Create an object to hold the base layers
var baseMaps = {
  'Light Map': lightMap,
  'Dark Map': darkMap,
  'Satellite Map': satelliteMap,
  'Street Map': streetMap
};

// **Define the universityLayer before using it**
var universityLayer = L.layerGroup();
// Define the infrastructure layer group
var infrastructureLayer = L.layerGroup();
// Define the support program layer group
var supportProgramLayer = L.layerGroup();

// **Create an object to hold the overlay layers**
var overlays = {
  // Add other overlays as needed
};

// Create the map instance
var map = L.map('map', {
  maxBoundsViscosity: 1.0,
  minZoom: 4,
  maxZoom: 18,
  layers: [lightMap] // Set the default base layer here
});

// Call the function to set the initial map view
setMapViewBasedOnScreenSize();

// Remove the default zoom control and re-add it to the desired position
map.removeControl(map.zoomControl);
L.control.zoom({ position: 'topleft' }).addTo(map);

// **Add the layer control to the map**
L.control.layers(baseMaps, overlays, { position: 'topleft' }).addTo(map);

// Function to set the map view based on screen size
function setMapViewBasedOnScreenSize() {
  var isPortrait = window.innerHeight > window.innerWidth;

  if (isPortrait) {
    // On portrait screens (smartphones), set a different center and zoom level
    var centerLatLng = [54.5, -4.0]; // Adjust center as needed
    var zoomLevel = 6; // Increase zoom level to zoom in on the UK

    map.setView(centerLatLng, zoomLevel);

    // Adjust maxBounds for portrait mode to prevent panning too far
    map.setMaxBounds([
      [49.5, -13.0], // Southwest coordinates
      [61.0, 5.0]    // Northeast coordinates
    ]);
  } else {
    // On landscape screens, fit the UK bounds
    map.fitBounds(ukBoundsLandscape);

    // Set maxBounds to the landscape bounds
    map.setMaxBounds(ukBoundsLandscape);
  }
}

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
window.selectionOrder = [];
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
var universityData = [];
var infrastructureData = [];
var supportProgramData = [];


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

// Load University Data
Papa.parse('data/university_data.csv', {
  header: true,
  download: true,
  dynamicTyping: true,
  complete: function(results) {
    universityData = results.data;
    console.log('University data loaded:', universityData);

    // Remove the code that checks `show-universities` here.
    // The layers will be handled by updateOverlays() now.
  }
});

function populateInfrastructureLayer(data) {
  infrastructureData = data;
}

Papa.parse('data/Infrastructure_data.csv', {
  download: true,
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  complete: function(results) {
    populateInfrastructureLayer(results.data);
  },
  error: function(error) {
    console.error('Error parsing business parks CSV:', error);
  }
});

function populateSupportProgramLayer(data) {
  supportProgramData = data;
}

// Load Support Program data
Papa.parse('data/support_program.csv', {
  download: true,
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  complete: function(results) {
    populateSupportProgramLayer(results.data);
  },
  error: function(err) {
    console.error('Error parsing Support Program CSV:', err);
  }
});

function finalizeMapSetup() {
  console.log('finalizeMapSetup called'); // Debugging log
  updateSearchControl('');
  updateLegend(''); // Initialize the search control
  addLegend();
}

// Updated snippet: Define the sector stats panel and map controls, then toggle them in sync
document.querySelectorAll('#layer-selection input[type=checkbox]').forEach(function (checkbox) {
  checkbox.addEventListener('change', function () {
    // Define references for the panel and controls (so we can toggle them)
    const panel = document.getElementById('sector-stats-panel');
    const controls = document.querySelector('.leaflet-control-container');

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

      // Toggle the panel and controls, so they slide if needed
      panel.classList.toggle('show');
      controls.classList.toggle('controls-shift-right');

      // Add the selected map layer
      switch (this.id) {
        case 'local-authorities':
          map.addLayer(localAuthoritiesLayer);
          break;
        case 'final-areas':
          /* highlight WMCA, wash out others */
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

    // After handling layer selection, check if no sectors are chosen
    if (currentSectors.length === 0) {
      // Remove any university or infrastructure markers
      if (map.hasLayer(universityLayer)) {
        map.removeLayer(universityLayer);
      }
      if (map.hasLayer(infrastructureLayer)) {
        map.removeLayer(infrastructureLayer);
      }

      // Set the overlay dropdown to 'none'
      var overlaySelect = document.getElementById('overlay-select');
      if (overlaySelect) {
        overlaySelect.value = 'none';
      }

      hideSectorStats();

    }

    // Close any open popups
    map.closePopup();
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
document.getElementById('overall-stats-button').addEventListener('click', function() {
  const statsPanel = document.getElementById('sector-stats-panel');
  // Grab everything that sits on the left side in Leaflet
  const leftControls = document.querySelectorAll('.leaflet-left');

  // If panel is already open, hide it and unshift controls:
  if (statsPanel.classList.contains('show')) {
    hideSectorStats();
    return;
  }

  // Otherwise, compute & show fresh stats, then shift all .leaflet-left controls:
  computeSectorStatistics();
  showSectorStatistics(currentSectors);

  leftControls.forEach(el => el.classList.add('controls-shift-right'));
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
  const statsPanel = document.getElementById('sector-stats-panel');
  const ctrlContainer = document.querySelector('.leaflet-control-container');

  if (sectorsList.length === 0) {
    // No sectors selected, clear data and remove layers
    companyData = [];
    clusterSummaryData = {};
    removeClusterLayers();
    updateLegend('');
    document.getElementById('overall-stats-button').style.display = 'none';

    // Auto-hide the stats panel and un-shift controls
    if (statsPanel) statsPanel.classList.remove('show');
    if (ctrlContainer) ctrlContainer.classList.remove('controls-shift-right');

    return;
  }

  const promises = sectorsList.map(sector => {
    const clusterFile   = sectors[sector];
    const summaryFile   = summaryStatsFiles[sector];
    const financialFile = financialDataFiles[sector];

    return new Promise(resolve => {
      // 1) Load the cluster data
      Papa.parse(`data/${clusterFile}`, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: clusterResults => {
          const clusterData = clusterResults.data.filter(c => c && c.Latitude && c.Longitude);

          // 2) Load the summary stats
          Papa.parse(`data/${summaryFile}`, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: summaryResults => {

              // 3) Load the financial data
              Papa.parse(`data/${financialFile}`, {
                download: true,
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: financialResults => {
                  resolve({
                    sector:        sector,
                    clusterData:   clusterData,
                    summaryData:   summaryResults.data,
                    financialData: financialResults.data
                  });
                },
                error: err => {
                  console.error(`Error parsing financial CSV for sector ${sector}:`, err);
                  resolve({
                    sector:        sector,
                    clusterData:   clusterData,
                    summaryData:   summaryResults.data,
                    financialData: []
                  });
                }
              });

            },
            error: err => {
              console.error(`Error parsing summary CSV for sector ${sector}:`, err);
              resolve({
                sector:        sector,
                clusterData:   clusterData,
                summaryData:   [],
                financialData: []
              });
            }
          });

        },
        error: err => {
          console.error(`Error parsing cluster CSV for sector ${sector}:`, err);
          resolve({
            sector:        sector,
            clusterData:   [],
            summaryData:   [],
            financialData: []
          });
        }
      });
    });
  });

  Promise.all(promises).then(sectorDataArray => {
    companyData = [];
    clusterSummaryData = {};

    // Merge all sector data
    sectorDataArray.forEach(sectorData => {
      const sector = sectorData.sector;
      const finMap = {};

      sectorData.financialData.forEach(rec => {
        finMap[rec.Companynumber] = rec;
      });

      // Merge per-company
      sectorData.clusterData.forEach(comp => {
        comp.sector    = sector;
        comp.cluster   = (comp.cluster != null ? comp.cluster.toString() : '0');
        comp.clusterId = `${sector}_${comp.cluster}`;

        const finRec = finMap[comp.Companynumber] || {};
        comp.Companyname                       = finRec.Companyname || 'Unknown';
        comp.BestEstimateGrowthPercentagePerYear = parseFloat(finRec.BestEstimateGrowthPercentagePerYear) || null;
        comp.TotalInnovateUKFunding            = parseFloat(finRec.TotalInnovateUKFunding)      || null;
        comp.WomenFounded                      = parseInt(finRec.WomenFounded)                 || null;
        comp.total_employees                   = parseNumber(finRec.TotalEmployees)           || 0;
        comp.total_turnover                    = parseNumber(finRec.TotalTurnover)            || 0;
      });

      companyData = companyData.concat(sectorData.clusterData);

      // Merge cluster summary
      sectorData.summaryData.forEach(sum => {
        const cid = `${sector}_${sum.cluster}`;
        clusterSummaryData[cid] = sum;
        clusterSummaryData[cid].sector = sector;
      });
    });

    // Exclude unwanted companies
    companyData = companyData.filter(c =>
      !excludedCompanyNumbers.includes(c.Companynumber.toString().trim())
    );

    // Rebuild map layers
    generateClusterColors();
    populateClusterCheckboxes();
    currentClusters = getAllClusterIds().filter(cid =>
      currentSectors.includes(cid.split('_')[0])
    );
    addCompanyClusters();
    computeSectorStatistics();
    updateLegend(currentSectors.length > 0 ? 'Sectors' : '');

    const statsPanel = document.getElementById('sector-stats-panel');
    if (statsPanel && statsPanel.classList.contains('show')) {
      computeSectorStatistics();
      const ordered = window.selectionOrder.length
        ? window.selectionOrder
        : currentSectors;
      showSectorStatistics(ordered);
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
  const statsPanel = document.getElementById('sector-stats-panel');
  if (!statsPanel) {
    console.error('No stats panel found in the DOM');
    return;
  }

  // Clear old content
  statsPanel.innerHTML = `
    <div class="stats-header">
      <h2>Sector Stats</h2>
      <button class="close-panel-btn" onclick="hideSectorStats()">&times;</button>
    </div>
  `;

  // Build card layouts for each sector
  selectedSectors.forEach(sector => {
    const stats = sectorStats[sector];
    if (!stats) {
      statsPanel.innerHTML += `
        <div class="stats-card">
          <h3>${sector}</h3>
          <p>No statistics available.</p>
        </div>
      `;
      return;
    }

    statsPanel.innerHTML += `
      <div class="stats-card">
        <h3>${sector}</h3>
        <p><strong>Companies:</strong> ${stats.companyCount}</p>
        <p><strong>Total Employees:</strong> ${Math.round(stats.totalEmployees)}</p>
        <p><strong>Total Turnover:</strong> ${formatTurnover(stats.totalTurnover)}</p>
        <p><strong>Avg Growth Rate:</strong> ${(stats.averageGrowthRate * 100).toFixed(2)}%</p>
        <p><strong>% Female-Founded:</strong> ${stats.femaleFoundedPercentage.toFixed(2)}%</p>
        <p><strong>IUK Funding:</strong> ${formatTurnover(stats.totalIUKFunding)}</p>
        <p><strong>Investment:</strong> ${formatTurnover(stats.totalInvestment)}</p>
      </div>
    `;
  });

  // Show the panel
  statsPanel.classList.remove('hidden');
  statsPanel.classList.add('show');
}

// Simple hide function
function hideSectorStats() {
  const statsPanel = document.getElementById('sector-stats-panel');
  // Again grab all .leaflet-left elements
  const leftControls = document.querySelectorAll('.leaflet-left');

  // Hide the panel
  statsPanel.classList.remove('show');

  // Remove the shift class so everything moves back
  leftControls.forEach(el => el.classList.remove('controls-shift-right'));
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

// Handle sector-chip clicks or Select-All / Deselect-All
function handleSectorSelectionChange () {

  // 1) Figure out which sectors are now selected
  currentSectors = getSelectedSectors();

  if (currentSectors.length > 0) {
    // 2) (Re)load company + cluster data for those sectors
    loadSectorsData(currentSectors);

    // 3) UI niceties
    document.getElementById('overall-stats-button').style.display = 'block';
  } else {
    // 2*) No sectors selected – wipe clusters & stats
    currentClusters = [];
    removeClusterLayers();
    document.getElementById('overall-stats-button').style.display = 'none';
    updateLegend('');
  }

  // 4) Keep any university / infrastructure overlays in sync
  updateOverlays();
}

function populateSectorCheckboxes() {
  const container = document.getElementById('sector-chips');
  container.innerHTML = '';

  Object.keys(sectors).forEach(sector => {
    const chip = document.createElement('div');
    chip.className     = 'sector-chip';
    chip.textContent   = sectorDisplayNames[sector] || sector;
    chip.dataset.value = sector;

    chip.onclick = () => {
      // 1) Toggle visual state
      chip.classList.toggle('selected');

      // 2) Maintain click-order
      if (chip.classList.contains('selected')) {
        if (!window.selectionOrder.includes(sector)) {
          window.selectionOrder.push(sector);
        }
      } else {
        window.selectionOrder = window.selectionOrder.filter(s => s !== sector);
      }

      // 3) Update map & stats
      handleSectorSelectionChange();

      // 4) **Ensure the display-mode bubble updates immediately**
      updateDisplayModeToggleVisibility();
    };

    container.appendChild(chip);
  });
}

// Call this function after sectors are loaded
populateSectorCheckboxes();

// Select All Sectors
document.getElementById('select-all-sectors').addEventListener('click', () => {
  document.querySelectorAll('.sector-chip').forEach(chip => chip.classList.add('selected'));
  handleSectorSelectionChange();
});

// Deselect All Sectors
document.getElementById('deselect-all-sectors').addEventListener('click', () => {
  document.querySelectorAll('.sector-chip').forEach(chip => chip.classList.remove('selected'));
  window.selectionOrder = [];
  handleSectorSelectionChange();
  updateDisplayModeToggleVisibility();
});

function updateClusterLayers() {
  console.log('updateClusterLayers called');
  console.log('Current displayMode:', displayMode);

  ///////////////////////////////////////////////////////////////////////
  // 1) Batch-based animation helpers for smoother transitions
  ///////////////////////////////////////////////////////////////////////

  // Simple ease-out function: t from 0->1 => slower near end
  function easeOut(progress) {
    return 1 - Math.pow(1 - progress, 3);
  }

  // Animates an array of circle markers from (radius=0, opacity=0) up to
  // (finalRadius, finalFillOpacity) using a single requestAnimationFrame loop
  function animateMarkersBatch(markers, finalRadius, finalFillOpacity, duration) {
    let startTime;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      let progress = Math.min(elapsed / duration, 1);

      // Ease-out
      progress = easeOut(progress);

      // Update all markers in batch
      markers.forEach(marker => {
        const currentRadius = finalRadius * progress; 
        const currentOpacity = finalFillOpacity * progress; 
        marker.setStyle({
          radius: currentRadius,
          fillOpacity: currentOpacity
        });
      });

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  // Animates an array of polygons from fillOpacity=0 up to finalFillOpacity
  // using a single requestAnimationFrame loop
  function animatePolygonsBatch(polygons, finalFillOpacity, duration) {
    let startTime;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      let progress = Math.min(elapsed / duration, 1);

      // Ease-out
      progress = easeOut(progress);

      // Update all polygons in batch
      polygons.forEach(polygon => {
        polygon.setStyle({
          fillOpacity: finalFillOpacity * progress
        });
      });

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  ///////////////////////////////////////////////////////////////////////
  // 2) Clear existing layers and gather new cluster data
  ///////////////////////////////////////////////////////////////////////

  // Clear the global polygons array
  allPolygons = [];

  // Remove existing cluster layers
  for (const existingId in clusterLayers) {
    map.removeLayer(clusterLayers[existingId]);
  }
  clusterLayers = {};

  if (currentClusters.length === 0) {
    updateLegend('');
    return; 
  }

  const clusters = {};
  companyData.forEach(company => {
    const clusterId = company.clusterId;
    if (currentClusters.includes(clusterId)) {
      if (!clusters[clusterId]) {
        clusters[clusterId] = [];
      }
      clusters[clusterId].push(company);
    }
  });

  ///////////////////////////////////////////////////////////////////////
  // 3) We'll collect newly created markers and polygons for batch animation
  ///////////////////////////////////////////////////////////////////////
  const newMarkers = [];   // all circle markers we create
  const newPolygons = [];  // all polygons we create

  ///////////////////////////////////////////////////////////////////////
  // 4) Build each cluster
  ///////////////////////////////////////////////////////////////////////
  for (const clusterId in clusters) {
    const clusterGroup = L.layerGroup();
    const points = [];

    // Aggregation variables
    let totalGrowthRate = 0;
    let growthRateCount = 0;
    let totalIUKFunding = 0;
    let femaleFoundedCount = 0;
    let totalEmployees = 0;
    let totalTurnover = 0;

    const clusterNumber = clusters[clusterId][0].cluster;
    const sectorName = clusters[clusterId][0].sector;
    const clusterName = clusters[clusterId][0].Cluster_name || 'Cluster ' + clusterNumber;
    const region = (clusterRegions[sectorName] && clusterRegions[sectorName][clusterNumber]) || 'Unknown';

    // Collect and aggregate data
    clusters[clusterId].forEach(company => {
      const lat = company.Latitude;
      const lng = company.Longitude;
      points.push([lat, lng]);

      const growthRate = company.BestEstimateGrowthPercentagePerYear;
      if (typeof growthRate === 'number' && !isNaN(growthRate)) {
        totalGrowthRate += growthRate;
        growthRateCount++;
      }
      const iukFunding = company.TotalInnovateUKFunding;
      if (typeof iukFunding === 'number' && !isNaN(iukFunding)) {
        totalIUKFunding += iukFunding;
      }
      if (company.WomenFounded === 1) {
        femaleFoundedCount++;
      }

      // Show markers if needed
      if (displayMode === 'points' || displayMode === 'both') {
        // Start circleMarker invisible: radius=0, fillOpacity=0
        const marker = L.circleMarker([lat, lng], {
          pane: 'markerPane',
          radius: 0,
          fillColor: getClusterColor(clusterId),
          color: '#000',
          weight: 0.2,
          fillOpacity: 0
        });

        // Marker popup
        marker.bindPopup(`
          <div class="popup-content">
            <p><strong>Company Name:</strong> ${company.Companyname}</p>
            <p><strong>Company Number:</strong> ${company.Companynumber}</p>
            <p><strong>Cluster:</strong> ${region} (Cluster ${clusterNumber})</p>
            <p><strong>Sector:</strong> ${company.sector}</p>
          </div>
        `);

        // Hover / click styling
        marker.on({
          mouseover: e => {
            e.target.setStyle({
              radius: 5,
              weight: 1,
              color: '#fff',
              fillOpacity: 1
            });
          },
          mouseout: e => {
            e.target.setStyle({
              radius: 3,
              weight: 0.2,
              color: '#000',
              fillOpacity: 0.8
            });
          },
          click: e => {
            e.target.openPopup();
          }
        });

        clusterGroup.addLayer(marker);
        newMarkers.push(marker);  // Collect for batch animation
      }
    });

    // Sector color
    const polygonColor = (clusterNumber === '0')
      ? '#D3D3D3'
      : (sectorColors[sectorName] || '#FFFFFF');

    // Possibly create polygon if enough points
    if ((displayMode === 'polygons' || displayMode === 'both') &&
        clusterNumber !== '0' &&
        points.length >= 3) {
      const polygon = L.polygon(convexHull(points), {
        pane: 'polygonsPane',
        color: polygonColor,
        fillColor: polygonColor,
        fillOpacity: 0,  // start at 0 for fade-in
        weight: 1,
        interactive: false
      });

      polygon.originalStyle = {
        color: polygonColor,
        weight: 1,
        fillOpacity: 0.2
      };

      // Aggregated stats
      const summary = clusterSummaryData[clusterId];
      const averageGrowthRate = (growthRateCount > 0)
        ? (totalGrowthRate / growthRateCount)
        : null;
      const femaleFoundedPercentage = clusters[clusterId].length > 0
        ? (femaleFoundedCount / clusters[clusterId].length) * 100
        : null;

      const companyCount = summary ? summary.companycount : clusters[clusterId].length;
      const totalEmployees = summary ? Math.round(summary.total_employees) : 'N/A';
      const totalTurnover = summary ? formatTurnover(summary.total_turnover) : 'N/A';
      const averageGrowthRateDisplay = (averageGrowthRate !== null)
        ? (averageGrowthRate * 100).toFixed(1) + '%'
        : 'N/A';
      const femaleFoundedPercentageDisplay = (femaleFoundedPercentage !== null)
        ? femaleFoundedPercentage.toFixed(1) + '%'
        : 'N/A';
      const totalIUKFundingDisplay = (totalIUKFunding > 0)
        ? formatTurnover(totalIUKFunding)
        : 'N/A';

      // Polygon popup
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

      clusterGroup.addLayer(polygon);

      // Keep track of the polygon in allPolygons
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

      newPolygons.push(polygon); // Collect for batch animation
    }

    clusterLayers[clusterId] = clusterGroup;
    clusterGroup.addTo(map);
  }

  ///////////////////////////////////////////////////////////////////////
  // 5) Animate all new markers / polygons in one go
  ///////////////////////////////////////////////////////////////////////
  if (newMarkers.length > 0) {
    animateMarkersBatch(newMarkers, 3, 0.8, 800); // finalRadius=3, fillOpacity=0.8, 800ms
  }
  if (newPolygons.length > 0) {
    animatePolygonsBatch(newPolygons, 0.2, 800);  // fade to fillOpacity=0.2, 800ms
  }

  ///////////////////////////////////////////////////////////////////////
  // 6) Update legend
  ///////////////////////////////////////////////////////////////////////
  if (currentSectors.length > 0) {
    updateLegend('Sectors');
  } else {
    updateLegend('');
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
    <h3>${props.region} (Cluster ${props.clusterNumber})</h3>
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
    <h3>${props.region} (Cluster ${props.clusterNumber})</h3>
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
      <h3>${props.region} (Cluster ${props.clusterNumber})</h3>
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
    tabLink.textContent = `Cluster ${props.clusterNumber} (${sectorDisplayName})`;

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

// Handle window resize
function onWindowResize() {
  map.invalidateSize();
  setMapViewBasedOnScreenSize();
}
window.addEventListener('resize', onWindowResize);

// Add event listener for the overlay dropdown
var overlaySelect = document.getElementById('overlay-select');
overlaySelect.addEventListener('change', updateOverlays);

function updateOverlays() {
  var value = overlaySelect.value;

  // 1) Always remove all three overlays first
  if (map.hasLayer(universityLayer))       map.removeLayer(universityLayer);
  if (map.hasLayer(infrastructureLayer))   map.removeLayer(infrastructureLayer);
  if (map.hasLayer(supportProgramLayer))   map.removeLayer(supportProgramLayer);

  // 2) Universities?
  if (value === 'universities' || value === 'both') {
    addUniversitiesToMap();                      // repopulate universityLayer
    if (universityLayer.getLayers().length) {
      universityLayer.addTo(map);
    }
  }

  // 3) Infrastructure?
  if (value === 'infrastructure' || value === 'both') {
    addInfrastructureToMap();                    // repopulate infrastructureLayer
    if (infrastructureLayer.getLayers().length) {
      infrastructureLayer.addTo(map);
    }
  }

  // 4) Support Programs?
  if (value === 'support-program' || value === 'both') {
    addSupportProgramsToMap();                   // repopulate supportProgramLayer
    if (supportProgramLayer.getLayers().length) {
      supportProgramLayer.addTo(map);
    }
  }

  // 'none' is implicit: nothing gets re‑added
}

// --- UNIVERSITIES ---
function addUniversitiesToMap() {
  universityLayer.clearLayers();
  const selectedSectors = currentSectors;

  universityData.forEach(univ => {
    const lat      = parseFloat(univ.Latitude);
    const lng      = parseFloat(univ.Longitude);
    const sector   = univ.Sector;
    const postcode = univ.Postcode || 'N/A';

    if (selectedSectors.includes(sector) && !isNaN(lat) && !isNaN(lng)) {
      // shorten website URL
      let linkHtml = '<p><em>No website info</em></p>';
      if (univ.Website) {
        try { const h = new URL(univ.Website).hostname;
              linkHtml = `<p><strong>Website:</strong> <a href="${univ.Website}" target="_blank">${h}</a></p>`; }
        catch(e) { linkHtml = `<p><strong>Website:</strong> ${univ.Website}</p>`; }
      }

      const popupHtml = `
        <div class="popup-content">
          <p><strong>University Name:</strong> ${univ['University Name']}</p>
          <p><strong>Faculty Name:</strong> ${univ['Faculty name']}</p>
          <p><strong>Sector:</strong> ${sector}</p>
          <p><strong>Postcode:</strong> ${postcode}</p>
          ${linkHtml}
        </div>
      `;

      L.marker([lat, lng], { icon: universityIcon })
        .bindPopup(popupHtml)
        .addTo(universityLayer);
    }
  });

  universityLayer.addTo(map);
}


// --- INFRASTRUCTURE ---
function addInfrastructureToMap() {
  infrastructureLayer.clearLayers();
  const selectedSectors = currentSectors;

  infrastructureData.forEach(rec => {
    const lat      = parseFloat(rec.Latitude);
    const lng      = parseFloat(rec.Longitude);
    const sector   = rec.Sector;
    const name     = rec['Name of Business/Science Park'] || 'Infrastructure';
    const postcode = rec.Postcode || 'N/A';

    if (selectedSectors.includes(sector) && !isNaN(lat) && !isNaN(lng)) {
      // shorten website URL
      let linkHtml = '<p><em>No website info</em></p>';
      if (rec.Website) {
        try { const h = new URL(rec.Website).hostname;
              linkHtml = `<p><strong>Website:</strong> <a href="${rec.Website}" target="_blank">${h}</a></p>`; }
        catch(e) { linkHtml = `<p><strong>Website:</strong> ${rec.Website}</p>`; }
      }

      const popupHtml = `
        <div class="popup-content">
          <p><strong>${name}</strong></p>
          <p><strong>Sector:</strong> ${sector}</p>
          <p><strong>Postcode:</strong> ${postcode}</p>
          ${linkHtml}
        </div>
      `;

      L.marker([lat, lng], { icon: infrastructureIcon })
        .bindPopup(popupHtml)
        .addTo(infrastructureLayer);
    }
  });

  infrastructureLayer.addTo(map);
}


// --- SUPPORT PROGRAMS ---
function addSupportProgramsToMap() {
  supportProgramLayer.clearLayers();
  const selectedSectors = currentSectors;

  supportProgramData.forEach(prog => {
    if (!prog['Co-ordinates']) return;
    const [latStr, lngStr] = prog['Co-ordinates'].split(',');
    const lat = parseFloat(latStr), lng = parseFloat(lngStr);
    if (isNaN(lat)||isNaN(lng)) return;

    const sector  = prog['Simplified Sector Mapping'];
    if (!selectedSectors.includes(sector)) return;

    const title    = prog.Title || 'Support Program';
    const postcode = prog.Locations_map_point_post_code || 'N/A';

    // shorten website URL
    let linkHtml = '<p><em>No website info</em></p>';
    if (prog['Website URL']) {
      try {
        const h = new URL(prog['Website URL']).hostname;
        linkHtml = `<p><strong>Website:</strong> <a href="${prog['Website URL']}" target="_blank">${h}</a></p>`;
      } catch(e) {
        linkHtml = `<p><strong>Website:</strong> ${prog['Website URL']}</p>`;
      }
    }

    const popupHtml = `
      <div class="popup-content">
        <p><strong>${title}</strong></p>
        <p><strong>Sector:</strong> ${sector}</p>
        <p><strong>Postcode:</strong> ${postcode}</p>
        ${linkHtml}
      </div>
    `;

    L.marker([lat, lng], { icon: supportIcon })
     .bindPopup(popupHtml)
     .addTo(supportProgramLayer);
  });
}

function getSelectedSectors () {
  return Array.from(
    document.querySelectorAll('.sector-chip.selected')
  ).map(chip => chip.dataset.value);
}


// Define the custom icon for university markers
var universityIcon = L.icon({
  iconUrl: 'data/university_marker.png', // Path to your image
  iconSize: [35, 35], // Size of the icon [width, height]
  iconAnchor: [12, 41], // Point of the icon which corresponds to marker's location
  popupAnchor: [0, -41], // Point from which the popup should open relative to the iconAnchor
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', // Optional
  shadowSize: [35, 35], // Optional
  shadowAnchor: [12, 41] // Optional
});

// Define a custom icon for infrastructure markers
var infrastructureIcon = L.icon({
  iconUrl: 'data/infra_marker.png', // Path to your PNG file
  iconSize: [35, 35],    // Adjust based on your image dimensions
  iconAnchor: [12, 41],  // Adjust as needed
  popupAnchor: [0, -41], // Adjust as needed
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [35, 35],
  shadowAnchor: [12, 41]
});

// Define a custom icon for support program markers
var supportIcon = L.icon({
  iconUrl: 'data/support prog_marker.png', // Path to your PNG file
  iconSize: [35, 35],    // Adjust based on your image dimensions
  iconAnchor: [12, 41],  // Adjust as needed
  popupAnchor: [0, -41], // Adjust as needed
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [35, 35],
  shadowAnchor: [12, 41]
});
