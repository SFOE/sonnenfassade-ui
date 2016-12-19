/**
 * Display the marker at the coordinate of an address. Then search the best roof
 * associates to this address 
 */
var onAddressFound = function(map, marker, address, autoSearchRoof, roofSearchTolerance) {
  $('.typeahead').typeahead('val', '');
  if (address) {
    var coord, label;
    if (!address.attrs) { // Address comes from geolocation
      coord = [address.geometry.x, address.geometry.y];
      var attr = address.attributes;
      label = attr.strname1 + ' ' + (attr.deinr || '') +
          ' <br>' + attr.plz4 + ' ' + attr.plzname;
    } else { // Address comes from search box
      // WARNING! Coordinates are inverted here.
      coord = [address.attrs.y, address.attrs.x];
      label = address.attrs.label.replace('<b>', '<br>').replace('</b>', '');
    }

    var start = label.search("<br>") + 4;
    var end = start + 4;

    updateSolarrechnerLinks(false, label.substring(start, end));

    $('#addressOutput').html(label);
    $(document.body).addClass('localized');
    $(document.body).addClass('address-found');
    $(document.body).removeClass('localized-error');
    $(document.body).removeClass('no-address');
    
    // Search best roof at this address
    if (autoSearchRoof) {
      marker.setPosition(coord);
      searchFeaturesFromCoord(map, coord, roofSearchTolerance).then(function(data) {
        onRoofFound(map, marker, data.results[0], true);
        // If no roof found zoom on the marker
        if (!data.results.length) {
          flyTo(map, coord, 0.25);
        }
      });
    }
  } else {
    $(document.body).removeClass('localized');
    $(document.body).removeClass('address-found');
    $(document.body).addClass('no-address');
    if (autoSearchRoof) {
      $(document.body).removeClass('roof no-roof no-roof-outside-perimeter');
      clearHighlight(map, marker); 
    }
  }
};

var updateRoofInfo = function(map, marker, roof) {

  var langs = ['de', 'fr', 'it', 'en'];
  var headers = ['0','1'];
  var permalink = addPermalink();

  var header = (headers.indexOf(permalink.header) != -1) ? permalink.header : headers[0];
  var lang = (langs.indexOf(permalink.lang) != -1) ? permalink.lang : langs[0];

  var suitability = getSuitabilityText(roof.attributes.klasse, window.translator);

  //fill content with attributes
  $('#mstrahlungOutput').html(formatNumber(roof.attributes.mstrahlung));
  $('#gstrahlungOutput').html(formatNumber(roof.attributes.gstrahlung));
  $('#pitchOutput').html(roof.attributes.neigung);
  $('#headingOutput').html(roof.attributes.ausrichtung + 180);
  $('#headingText').html(getOrientationText(roof.attributes.ausrichtung, window.translator));
  $('#areaOutput').html(formatNumber(Math.round(roof.attributes.flaeche)));
  $('#eignung').html(suitability.substr(0, 1).toUpperCase() + suitability.substr(1));
  $('#eignung3').html(suitability.substr(0, 1).toUpperCase() + suitability.substr(1));

  if ($.contains(document.body, document.getElementById("stromertrag"))) {
    $('#stromertrag').html(formatNumber(Math.round((roof.attributes.gstrahlung*0.17*0.8)/100)*100));
  }

  //**** NEW

  var heatingDemand = '';
  if (roof.attributes.bedarf_heizung > 0) {
    heatingDemand += ' ' + formatNumber(Math.round(roof.attributes.bedarf_heizung))
            + ' ' + translator.get('kWh');
  } else {
    heatingDemand = '-';
  } 
  if ($.contains(document.body, document.getElementById("heatingDemand"))) {
  document.getElementById("heatingDemand").innerhtml =  $('#heatingDemand').html(heatingDemand);
  }

  var warmWaterDemand = '';
  if (roof.attributes.bedarf_warmwasser > 0) {
    warmWaterDemand += ' ' + formatNumber(roof.attributes.bedarf_warmwasser)
            + ' ' + translator.get('kWh');
  } else {
    warmWaterDemand = '-';
  } 
  if ($.contains(document.body, document.getElementById("warmWaterDemand"))) {
  document.getElementById("warmWaterDemand").innerhtml =  $('#warmWaterDemand').html(warmWaterDemand);
  }
    

  var reservoir = '';
  if (roof.attributes.volumen_speicher > 0) {
    reservoir += ' ' + formatNumber(roof.attributes.volumen_speicher)
            + ' ' + translator.get('liter');
  } else {
    reservoir = '-';
  } 
  if ($.contains(document.body, document.getElementById("reservoir"))) {
  document.getElementById("reservoir").innerhtml =  $('#reservoir').html(reservoir);
  } 
  
  
  var collectorSurface = '';
  if (roof.attributes.flaeche_kollektoren > 0) {
    collectorSurface += ' ' + formatNumber(Math.round(roof.attributes.flaeche_kollektoren))
            + ' ' + translator.get('m2');
  } else {
    collectorSurface = '-';
  } 
  if ($.contains(document.body, document.getElementById("collectorSurface"))) {
  document.getElementById("collectorSurface").innerhtml = $('#collectorSurface').html(collectorSurface);
  } 


  if ($.contains(document.body, document.getElementById("meanRadiation"))) {
    document.getElementById("meanRadiation").innerhtml = $('#meanRadiation').html(formatNumber(roof.attributes.mstrahlung));
  }

  if ($.contains(document.body, document.getElementById("totalRadiation"))) {
    document.getElementById("totalRadiation").innerhtml = $('#totalRadiation').html(formatNumber(roof.attributes.gstrahlung));
  }

  var heatDemand = '';
  if (roof.attributes.dg_waermebedarf > 0) {
    heatDemand += ' ' + formatNumber(Math.round(roof.attributes.dg_heizung))
            + ' ' + translator.get('percent');
  } else {
    heatDemand = '-';
  } 
  if ($.contains(document.body, document.getElementById("heatDemand"))) {
  document.getElementById("heatDemand").innerhtml = $('#heatDemand').html(heatDemand);
  }

  //symbol for suitability
  if ($.contains(document.body, document.getElementById("eignungSymbol"))) {
    document.getElementById("eignungSymbol").src = 'images/s' + roof.attributes.klasse + '.png';
  }

  //text for suitability
  if (roof.attributes.klasse < 3) {
    $('#eignungText').html(translator.get('eignungText1') + ' <strong>' + suitability + '</strong> ' + translator.get('eignungText2'));
  } else {
    $('#eignungText').html(translator.get('eignungText3') + translator.get('eignungText1') + ' <strong>' + suitability + '</strong> ' + translator.get('eignungText2'));
  }

  var finanzertrag;

  if (roof.attributes.finanzertrag < 1000) {
    finanzertrag = formatNumber(Math.round(roof.attributes.finanzertrag/10)*10);
  } else {
    finanzertrag = formatNumber(Math.round(roof.attributes.finanzertrag/100)*100);
  }

  if ($.contains(document.body, document.getElementById("finanzertrag"))) {
    document.getElementById("finanzertrag").innerHTML = finanzertrag;
  }

  if ($.contains(document.body, document.getElementById("finanzertrag2"))) {
    document.getElementById("finanzertrag2").innerHTML = finanzertrag;
  }

  if ($.contains(document.body, document.getElementById("eignungbutton2"))) {
    document.getElementById("eignungbutton2").className = 'button2 scrolly button2suit' + roof.attributes.klasse;
  }

  //add css-class
  $(document.body).removeClass('no-roof').removeClass('no-roof-outside-perimeter').addClass('roof');
  
  //Titel Solarstrom
  if ($.contains(document.body, document.getElementById("TitelSolarstrom"))) {

    var TitelSolarstromText = '';

    if (roof.attributes.waermeertrag > 0) {
      TitelSolarstromText += translator.get('solarstromVorTitel');
    } else {
      TitelSolarstromText += translator.get('solarstromVorTitel3');
    }

    TitelSolarstromText += '<strong>'
      + formatNumber(Math.round((roof.attributes.gstrahlung*0.17*0.8)/100)*100)
      + '</strong> '
      + translator.get('solarstromTitel')
      + '<strong> '
      + finanzertrag + '&nbsp;'
      + translator.get('solarstromTitel2')
      + '</strong>';

    if (roof.attributes.waermeertrag > 0) {
      TitelSolarstromText += '...';
    }

    TitelSolarstromText += ' <a href="#twelve" class="scrolly icon major fa-info-circle" style="font-size:0.2em;cursor: pointer;"></a>';

    $('#TitelSolarstrom').html(TitelSolarstromText);

    $('#pvpic1').attr("src","images/fassade_100.png");
    $('#pvpic2').attr("src","images/fassade_50.png");
    $('#pvpic3').attr("src","images/fassade_25.png");
    $('#pv100text').html(translator.get('pv100text'));
    $('#pv75text').html(translator.get('pv75text'));
    $('#pv50text').html(translator.get('pv50text'));

  }

  $('#pv100').html(formatNumber(Math.round((roof.attributes.gstrahlung*0.17*0.8)/100)*100*1));
  $('#pv75').html(formatNumber(Math.round((roof.attributes.gstrahlung*0.17*0.8)/100)*100*0.75));
  $('#pv50').html(formatNumber(Math.round((roof.attributes.gstrahlung*0.17*0.8)/100)*100*0.5));

  // check if no waermeertrag and if no dg_waermebedarf
  var titleHeat = '';
  if (roof.attributes.waermeertrag > 0) {
    titleHeat += translator.get('solarthermieVorTitel') + '<strong>' + formatNumber(Math.round(roof.attributes.waermeertrag/100)*100)
                + '</strong> ' + translator.get('solarthermieTitel1');

    if (roof.attributes.dg_waermebedarf > 0) {
      titleHeat += ' ' + roof.attributes.dg_waermebedarf + '&nbsp;'
                   + translator.get('solarthermieTitel2');
    }

    $('#thermiebutton').addClass('show-thermie').removeClass('hide-thermie');
  } else {
    $('#thermiebutton').removeClass('show-thermie').addClass('hide-thermie');
    titleHeat = translator.get('solarthermieTitelnoHeat');
  }

  $('#heatTitle').html(titleHeat + ' <a href="#twelve" class="scrolly icon major fa-info-circle" style="font-size:0.2em;cursor: pointer;"></a>');

  var textHeat = '';
  if (roof.attributes.duschgaenge > 0) {
    textHeat += translator.get('solarthermieText1') 
                + ' ' + roof.attributes.duschgaenge
                + translator.get('solarthermieText2');
  } else {
    textHeat = '';
  }

  if ($.contains(document.body, document.getElementById("heatText"))) {
    $('#heatText').html(textHeat);
  }

  if ($.contains(document.body, document.getElementById("PVbuttonText"))) {

    document.getElementById("PVbuttonText").innerHTML = '';

    if (roof.attributes.waermeertrag > 0) {
      document.getElementById("PVbuttonText").innerHTML += translator.get('solarstromVorTitel2');
    }

    document.getElementById("PVbuttonText").innerHTML += 
    translator.get('PVbuttonText1') + " " + finanzertrag + " " + translator.get('solarstromTitel2');

    if (roof.attributes.waermeertrag > 0) {
      document.getElementById("PVbuttonText").innerHTML += '...';
    }

  }

  if ($.contains(document.body, document.getElementById("thermiebuttonText"))) {
    document.getElementById("thermiebuttonText").innerHTML = 
    translator.get('solarthermieVorTitel') + translator.get('thermiebuttonText1') + " " + roof.attributes.dg_waermebedarf + " % " + translator.get('thermiebuttonText2');
  }

  if ($.contains(document.body, document.getElementById("printLink"))) {

    document.getElementById('printLink').href = 
      'print.html?featureId=' + roof.featureId +
      '&header=' + header +
      '&lang=' + lang;
  }

  if ($.contains(document.body, document.getElementById("linkToSonnendach"))) {
    document.getElementById('linkToSonnendach').href = 'http://www.bfe-gis.admin.ch/sonnendach/?lang=' + lang + '&building=' + roof.attributes.building_id;
  }

  if ($.contains(document.body, document.getElementById("documentationLink"))) {

    document.getElementById('documentationLink').href = translator.get('documentationLink');
  }

  if ($.contains(document.body, document.getElementById("stepbystepLink"))) {

    document.getElementById('stepbystepLink').href = translator.get('stepbystepLink');
  }

  if ($.contains(document.body, document.getElementById("einbettenLink"))) {

    document.getElementById('einbettenLink').href = 
      'einbetten.html?lang=' + lang;
  }

  //heat output value
  var solarHeat = '';
  
  if (roof.attributes.waermeertrag > 0) {
    solarHeat += ' ' + formatNumber(Math.round(roof.attributes.waermeertrag/100)*100)
            + ' ' + translator.get('solarHeatYear');
  } else {
    solarHeat = translator.get('solarthermieTitelnoHeat');
  }

  if ($.contains(document.body, document.getElementById("solarHeat"))) {
    document.getElementById("solarHeat").innerhtml = $('#solarHeat').html(solarHeat);
  } 

  
  //***** NEW saved heating costs
  var solarHeatCost = '';
  if (roof.attributes.dg_waermebedarf > 0) {
    solarHeatCost += ' ' + roof.attributes.dg_waermebedarf
            + ' ' + translator.get('savingSolarheatYear');
  } else {
    solarHeatCost = translator.get('solarthermieTitelnoHeat');
  }
  
  if ($.contains(document.body, document.getElementById("solarHeatCost"))) {
    document.getElementById("solarHeatCost").innerhtml = $('#solarHeatCost').html(solarHeatCost);
  }  


//Get Month and Year
    var month = new Array();
    month[1] = "january";
    month[2] = "february";
    month[3] = "march";
    month[4] = "april";
    month[5] = "may";
    month[6] = "june";
    month[7] = "july";
    month[8] = "august";
    month[9] = "september";
    month[10] = "october";
    month[11] = "november";
    month[12] = "december";

   var i;
   var Y = 0;
   var latestDate = new Date(roof.attributes.gs_serie_start.substring(0,10));
   var text1 = '';
   var text2 = '';
   var year = '';

    for (i = 0; i < 12; i++) {
      Y = '' + i;
      if (i > 0) {
        latestDate.setMonth(latestDate.getMonth()-1);  
      }
      year = latestDate.getFullYear(latestDate);
      text1 = translator.get(month[roof.attributes.monate[i]]);
      text2 = text1 + '&nbsp;' + year;
      if ($.contains(document.body, document.getElementById("month" + Y))) {
        document.getElementById("month" + Y).innerhtml = $('#month' + Y).html(text2);
      }
    }  


//Get monats_ertrag
  var j;
  var YY = '';
  var XX = roof.attributes.monats_ertrag;
  for (j = 0; j < 12; j++) {
    YY = '' + j;
    if ($.contains(document.body, document.getElementById("powerProductionMonth"+ YY))) {
      document.getElementById("powerProductionMonth"+ YY).innerhtml = $('#powerProductionMonth' + YY).html(formatNumber(Math.round(roof.attributes.monats_ertrag[j] * roof.attributes.flaeche)));
      document.getElementById("financeMonth"+ YY).innerhtml = $('#financeMonth' + YY).html(formatNumber(Math.round(roof.attributes.monats_ertrag[j] * roof.attributes.flaeche * 0.1)));
    }
  } 

//***** NEW Get heizgradtage
  var k;
  var YYY = '';
  var XXX = roof.attributes.heizgradtage;
  for (k = 0; k < 12; k++) {
    YYY = '' + k;
    if ($.contains(document.body, document.getElementById("powerProductionMonth" + YYY))) {
      document.getElementById("powerProductionMonth" + YYY).innerhtml = $('#heatingDaysMonth' + YYY).html(formatNumber(Math.round(roof.attributes.heizgradtage[k]))); 
    }
  } 
   
//************

  // Clear the highlighted roof the add the new one
  var polygon = new ol.geom.Polygon(roof.geometry.rings); 
  var vectorLayer = clearHighlight(map, marker);
  vectorLayer.getSource().addFeature(new ol.Feature(polygon));
  marker.setPosition(polygon.getInteriorPoint().getCoordinates());
  flyTo(map, marker.getPosition(), 0.25);

  if ($.contains(document.body, document.getElementById("thisIsPrint"))) {
    updateBarChart(roof, roof.attributes.klasse, roof.attributes.flaeche, 1);  
  } else {
    updateBarChart(roof, roof.attributes.klasse, roof.attributes.flaeche, 0);
  }

  updateSolarrechnerLinks(roof, false);
  
};


/**
 * Adds Parameters to Link to Solarrechner
 */
var updateSolarrechnerLinks = function () {
  var lastRoof, lastPlz, lastFlaeche;
  return function(roof, plz) {
    if (roof) {
      lastRoof = roof;
    }
    if (plz) {
      lastPlz = plz;
    }

    var parameters = '';
    if (lastPlz) {
      parameters += '&POSTLEITZAHL=' + lastPlz;
    }

    if (lastRoof) {
      parameters += '&NEIGUNG=' + lastRoof.attributes.neigung;
      parameters += '&AUSRICHTUNG=' + lastRoof.attributes.ausrichtung;
      parameters += '&BEDARF_WARMWASSER=' + lastRoof.attributes.bedarf_warmwasser;
      lastFlaeche = Math.round(lastRoof.attributes.flaeche);
    }

    var langs = ['de', 'fr', 'it', 'en'];
    var permalink = addPermalink();
    var lang = (langs.indexOf(permalink.lang) != -1) ? permalink.lang : langs[0];

    var linkESRechner = '';

    if (lang == 'de') {
      linkESRechner = 'https://www.energieschweiz.ch/page/de-ch/solarrechner/';
    } else if (lang == 'fr') {
      linkESRechner = 'https://www.suisseenergie.ch/page/fr-ch/calculateur-solaire/';
    } else if (lang == 'it') {
      linkESRechner = 'https://www.svizzeraenergia.ch/page/it-ch/calcolatore-solare/';
    } else if (lang == 'en') {
      linkESRechner = 'https://www.energieschweiz.ch/page/de-ch/solarrechner/';
    }    
      
    if ($.contains(document.body, document.getElementById("buttonSolRPV100"))) {
      document.getElementById("buttonSolRPV100").href = 
        linkESRechner + '?SYSTEM=1&TECHNOLOGIE=1' + parameters + "&FLAECHE=" + lastFlaeche;
    }

    if ($.contains(document.body, document.getElementById("buttonSolRPV75"))) {
      document.getElementById("buttonSolRPV75").href = 
        linkESRechner + '?SYSTEM=1&TECHNOLOGIE=1' + parameters + "&FLAECHE=" + Math.round(lastFlaeche*0.75);
    }

    if ($.contains(document.body, document.getElementById("buttonSolRPV50"))) {
      document.getElementById("buttonSolRPV50").href = 
        linkESRechner + '?SYSTEM=1&TECHNOLOGIE=1' + parameters + "&FLAECHE=" + Math.round(lastFlaeche*0.5);
    }    

    if ($.contains(document.body, document.getElementById("buttonSolRThermie"))) {
      document.getElementById("buttonSolRThermie").href = 
        linkESRechner + '?SYSTEM=2&TECHNOLOGIE=2' + parameters + "&FLAECHE=" + Math.round(lastFlaeche);
    }

    if ($.contains(document.body, document.getElementById("hintSolarrechner"))) {
      document.getElementById("hintSolarrechner").href = 
        linkESRechner + '?SYSTEM=2&TECHNOLOGIE=2' + parameters + "&FLAECHE=" + Math.round(lastFlaeche);
    }

  };
}();


/**
 * Display the data of the roof selected
 */
var onRoofFound = function(map, marker, roof, findBestRoof) {
  if (roof && roof.perimeter === undefined) {

    // Find best roof for given building
    if (findBestRoof) {
      searchBestRoofFromBuildingId(roof.attributes.building_id).then(function(roof) {
        updateRoofInfo(map, marker, roof);
      });
    } else {
      updateRoofInfo(map, marker, roof);
    }

  } else {

    // Clear the highlighted roof
    clearHighlight(map, marker);
    if (!roof || roof.perimeter) {
      $(document.body).removeClass('roof').removeClass('no-roof-outside-perimeter').addClass('no-roof');
    } else {
      $(document.body).removeClass('roof no-roof').removeClass('no-roof').addClass('no-roof-outside-perimeter');
    }
  }

}

// Remove the highlighted roof from the map
// Returns the vectorLayer cleared
var clearHighlight = function(map, marker) {
  marker.setPosition(undefined);
  // Search the vector layer to highlight the roof
  var vectorLayer;
  map.getLayers().forEach(function(layer) {
    if (layer instanceof ol.layer.Vector) {
      vectorLayer = layer;
    }
  });

  // Remove the previous roof highlighted
  vectorLayer.getSource().clear();
  return vectorLayer;
}

/**
 * Initialize the element of the app: map, search box, localizaton
 */
var init = function(nointeraction) {
  $.support.cors = true;
  window.API3_URL = 'https://api3.geo.admin.ch';
  
  var langs = ['de', 'fr', 'it', 'en'];
  var headers = ['0','1'];
  var body = $(document.body);
  var locationBt = $('#location');
  var markerElt = $('<div class="marker ga-crosshair"></div>');
  var permalink = addPermalink();

  // Load Header
  var header = (headers.indexOf(permalink.header) != -1) ? permalink.header : headers[0];

  if (header == '1') {
    //EnergieSchweiz Header
    $('#ech').removeClass('hide');
    $('#orange').removeClass('hide');
  } else {
    $('#eig').removeClass('hide');
    $('#red').removeClass('hide');
  }

  // Load the language
  var lang = (langs.indexOf(permalink.lang) != -1) ? permalink.lang : langs[0]; 
  window.translator = $('html').translate({
    lang: lang,
    t: sdTranslations // Object defined in tranlations.js
  });

  if (header == '1') {
    if (lang == 'de') {
      $('#logoech').css('background','url("images/echlogo-de.png") no-repeat center left');
    } else if (lang == 'fr') {
      $('#logoech').css('background','url("images/echlogo-fr.png") no-repeat center left');
    } else if (lang == 'it') {
      $('#logoech').css('background','url("images/echlogo-it.png") no-repeat center left');
    } else if (lang == 'en') {
      $('#logoech').css('background','url("images/echlogo-de.png") no-repeat center left');
    }
  } 


  //add locate-symbol
  if ($.contains(document.body, document.getElementById("location"))) {
    document.getElementById("location").innerHTML = document.getElementById("location").innerHTML + ' <span class="icon fa-location-arrow"></span>';
  }

  // Create map
  createMap('map', lang, nointeraction).then(function(map) {;
    var marker = new ol.Overlay({
      positioning:'bottom-center',
      element: markerElt[0],
      position: undefined,
      stopEvent: false
    });
    map.addOverlay(marker);
    map.on('singleclick', function(evt){
      var coord = evt.coordinate;
      //Do roof search explicitely
      searchFeaturesFromCoord(map, coord, 0.0).then(function(data) {
        onRoofFound(map, marker, data.results[0], false); //???????
        // We call the geocode function here to get the
        // address information for the clicked point using
        // the GWR layer.
        // The false parameter indicates that geocode does
        // not trigger a roof search.
        // Relouch the roof search with the coordinate of address if necessary.
        var relaunchRoofSearch = (data.results.length == 0);
        geocode(map, coord).then(function(data) {
          // We assume the first of the list is the closest
          onAddressFound(map, marker, data.results[0], relaunchRoofSearch, 0.0);
        });
      });
    });

    // Init the search input
    initSearch(map, marker, onAddressFound);

    // Init geoloaction button
    locationBt.click(function() {
      body.removeClass('localized-error');
      getLocation(map, marker, onAddressFound, function(msg) {
        $(document.body).addClass('localized-error');
        $('#locationError').html(msg);
      });
    });

    // Display the feature from permalink
    if (permalink.featureId) {
      searchFeatureFromId(permalink.featureId).then(function(data) {

        var coord = ol.extent.getCenter(data.feature.bbox);
        // Assure to be around resulting point with correct zoom level
        map.getView().setCenter(coord);
        map.getView().setResolution(0.25);

        geocode(map, coord).then(function(data) {
          // We assume the first of the list is the closest
          onAddressFound(map, marker, data.results[0], false, 50.0);
        });

        goTo('one');

        // Add the featureId to the lang link href
        $('#lang a').attr('href', function(index, attr) {
          this.href = attr + '&featureId=' + permalink.featureId;
        });

        onRoofFound(map, marker, data.feature); //??????

      });
    }

    // Display the feature from building-id
    if (permalink.building) {

      var url = API3_URL + '/rest/services/api/MapServer/find?' +
          'layer=ch.bfe.solarenergie-eignung-daecher&' +
          'searchField=building_id&' +
          'searchText=' + permalink.building +
          '&contains=false';
      return $.getJSON(url).then(function(data) {
        var bestRoof = data.results[0];
        var bestRoofFeatureId = bestRoof.featureId;
        for (var i = 0; i < data.results.length; i++) {
          roofCandidate = data.results[i];
          if (roofCandidate.attributes.mstrahlung >
              bestRoof.attributes.mstrahlung) {
            bestRoof = roofCandidate;
            bestRoofFeatureId = roofCandidate.featureId;
          }
        }

        searchFeatureFromId(bestRoofFeatureId).then(function(data) {

          var coord = ol.extent.getCenter(data.feature.bbox);
          // Assure to be around resulting point with correct zoom level
          map.getView().setCenter(coord);
          map.getView().setResolution(0.25);

          geocode(map, coord).then(function(data) {
            // We assume the first of the list is the closest
            onAddressFound(map, marker, data.results[0], false, 50.0);
          });

          goTo('one');

          // Add the featureId to the lang link href
          $('#lang a').attr('href', function(index, attr) {
            this.href = attr + '&featureId=' + permalink.featureId;
          });

          onRoofFound(map, marker, data.feature); //?

        });

      });
      
    }


  });

  if ($.contains(document.body, document.getElementById("socialTwitter"))) {
    document.getElementById("socialTwitter").href = 
    'https://twitter.com/intent/tweet?text=' + translator.get('pagetitle').replace(" ","%20") + '&url=' + translator.get('domain') + '&related=mhertach,BFEenergeia,EnergieSchweiz&hashtags=solar&via=EnergieSchweiz';
  }

  if ($.contains(document.body, document.getElementById("socialFB"))) {
    document.getElementById("socialFB").href = 
    'http://www.facebook.com/sharer.php?u=' + translator.get('domain').replace(" ","%20");
  }

  if ($.contains(document.body, document.getElementById("socialMail"))) {
    document.getElementById("socialMail").href = 
    'mailto:?subject=' + translator.get('pagetitle') + ' ' + translator.get('domain');
  }

  if ($.contains(document.body, document.getElementById("linkToSonnendach"))) {
    document.getElementById('linkToSonnendach').href = translator.get('domain');
  }  

  if ($.contains(document.body, document.getElementById("documentationLink"))) {

    document.getElementById('documentationLink').href = translator.get('documentationLink');
  }

  if ($.contains(document.body, document.getElementById("stepbystepLink"))) {

    document.getElementById('stepbystepLink').href = translator.get('stepbystepLink');
  }

  if ($.contains(document.body, document.getElementById("einbettenLink"))) {

    document.getElementById('einbettenLink').href = 
      'einbetten.html?lang=' + lang;
  }

  if ($.contains(document.body, document.getElementById("hintSolarrechner"))) {
    document.getElementById("hintSolarrechner").href = 
      'http://www.energieschweiz.ch/de-ch/erneuerbare-energien/meine-solaranlage/solarrechner.aspx?SYSTEM=2&TECHNOLOGIE=2';
  }

  // Remove the loading css class 
	body.removeClass('is-loading');

  $(document).ready(function ()
  {
      document.title = translator.get('pagetitle');
  });
  
}
