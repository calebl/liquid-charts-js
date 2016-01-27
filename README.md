# liquid-charts-js
Liquid Charts is a javascript library for displaying charts build in Liquid on third party sites.

Liquid Charts currently only supports displaying public charts. Capabilities for displaying charts from private datasets will come in later versions.

## Dependencies
* jQuery 2.2 (http://code.jquery.com/jquery-2.2.0.min.js)
* momentjs (http://momentjs.com/downloads/moment.js)
* underscorejs (http://underscorejs.org/underscore-min.js)
* highcharts (https://code.highcharts.com/highcharts.js)

  For exporting charts, you can also include the highcharts export module (https://code.highcharts.com/modules/exporting.js)

## Usage
  See example directory for usage. Use the node package http-server (https://github.com/indexzero/http-server) from the example folder to test locally.

## Setup
1. Include liquid-charting.js or liquid-charts.min.js with dependencies.
1. Initialize library with server url and ssl flag

  ``Liquid.init("getliquid.io",true)``

1. Call initChart on div where you want the chart to be displayed and pass the ID of the chart.

  ``Liquid.initChart($('#chart'),"5huH969SKL3KcJsKN")``
