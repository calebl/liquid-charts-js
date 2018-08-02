import _ from 'lodash';
import http from 'http';
import Highcharts from "highcharts/highstock";

const defaultChartOptions = {
  "title" : {
    "text" : "CGC Live Permeable Pavement Experiment"
  },
  legend: {
    enabled: true,
    align: 'left',
    backgroundColor: '#FFF',
    borderColor: 'black',
    borderWidth: 1,
    layout: 'vertical',
    verticalAlign: 'top',
    y: 100,
    shadow: true
  },
  rangeSelector: {
    selected: 1
  },
  "tooltip" : {
    "shared" : true,
    "crosshairs" : true,
    "dateTimeLabelFormats" : {
      "millisecond" : "%l:%M:%S.%L %P",
      "second" : "%l:%M:%S %P",
      "minute" : "%l:%M %P",
      "hour" : "%l:%M %P",
      "day" : "%e. %b",
      "week" : "%e. %b",
      "month" : "%b '%y",
      "year" : "%Y"
    }
  },
  "xAxis" : {
    "type" : "datetime",
    "dateTimeLabelFormats" : {
      "millisecond" : "%l:%M:%S.%L %P",
      "second" : "%l:%M:%S %P",
      "minute" : "%l:%M %P",
      "hour" : "%l:%M %P",
      "day" : "%e. %b",
      "week" : "%e. %b",
      "month" : "%b '%y",
      "year" : "%Y"
    }
  },
  "yAxis" : [
    {
      "labels" : {
        "format" : "{value} in.",
        "style" : {
          "color" : "#8bbc21"
        }
      },
      "title" : {
        "text" : "Rainfall",
        "style" : {
          "color" : "#8bbc21"
        }
      },
      "min" : 0,
      "opposite": true
    },
    {
      "gridLineWidth" : 0,
      "title" : {
        "text" : "Volume",
        "style" : {
          "color" : "#be5c47"
        }
      },
      "labels" : {
        "format" : "{value} gal.",
        "style" : {
          "color" : "#be5c47"
        }
      },
      "min" : 0,
      "tooltip" : {
        "valueSuffix" : " gal."
      },
      "opposite" : false
    }
  ]
};
const rainGuage = {
  "id" : "D50000000F681B1D",
  "name" : "Rain Guage 1",
  "color" : "#8bbc21",
  "type" : "column",
  "lineWidth" : 3,
  "tooltip" : {
    "valueSuffix" : " in."
  },
  "marker" : {
    "enabled" : false
  },
  "data" : []
};
const zone1 = {
  "id" : "BC0000000F968F1D",
  "name" : "Permeable Asphalt (Zone 1)",
  "color" : "#476ebe",
  "type" : "column",
  "lineWidth" : 3,
  "yAxis" : 1,
  "tooltip" : {
    "valueSuffix" : " gal."
  },
  "marker" : {
    "enabled" : false
  },
  "data" : []
};
const zone2 = {
  "id" : "280000000F861C1D-V",
  "name" : "Permeable Concrete (Zone 2)",
  "color" : "#47a9be",
  "type" : "column",
  "lineWidth" : 3,
  "yAxis" : 1,
  "tooltip" : {
    "valueSuffix" : " gal."
  },
  "marker" : {
    "enabled" : false
  },
  "data" : []
};
const zone3 = {
  "id" : "520000000FDDDC1D",
  "name" : "Concrete (Zone 3)",
  "color" : "#be9847",
  "type" : "column",
  "lineWidth" : 3,
  "yAxis" : 1,
  "tooltip" : {
    "valueSuffix" : " gal."
  },
  "marker" : {
    "enabled" : false
  },
  "data" : []
};
const zone4 = {
  "id" : "E10000000DD5271D",
  "name" : "Paver 1 (Zone 4)",
  "color" : "#47be98",
  "type" : "column",
  "lineWidth" : 3,
  "yAxis" : 1,
  "tooltip" : {
    "valueSuffix" : " gal."
  },
  "marker" : {
    "enabled" : false
  },
  "data" : []
};
const zone5 = {
  "id" : "070000000F87D01D",
  "name" : "Paver 2 (Zone 5)",
  "color" : "#be5c47",
  "type" : "column",
  "lineWidth" : 3,
  "yAxis" : 1,
  "tooltip" : {
    "valueSuffix" : " gal."
  },
  "marker" : {
    "enabled" : false
  },
  "data" : []
};

const zones = [rainGuage, zone1, zone2, zone3, zone4, zone5];


class CGCLiveChart {
  constructor(options, elementId) {
    this.options = _.extend(defaultChartOptions, options);

    this.chart = Highcharts.stockChart(elementId, this.options);
    this.series = [];

    //get all data
    this.getAllData();

    //TODO: add data to chart

    //TODO: setup data polling

    //TODO: save data locally??

    return this;
  }

  getAllData() {
    const url = 'http://165.227.252.41/getData?key=2dc01e504a258402e25137fd167ef11af37e2be79f6e0d9d';

    let result = "";
    const req = http.get(url, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        result += chunk;
      });
      res.on('end', () => {
        const datas = JSON.parse(result);

        for(let i=0; i< zones.length; i++){
          this.series[i] = this.addDataToZone(datas,zones[i]);

          this.chart.addSeries(this.series[i])
        }
      });
    });
  }

  addDataToZone(datas,zone){
    let data = _.find(datas,function(d){ return d.id === zone.id });
    let series = _.clone(zone);
    series.data = [...zone.data, ...data.data];
    return series;
  }

}

window.CGCLiveChart = new CGCLiveChart({}, 'chart');