// $(document).ready( function() {
//   Liquid.init("getliquid.io", true);
//   //Liquid.initChart($('#chart'),"wF86QhjrJtY6N8T2t", true)
//   //Liquid.initChart($('#chart2'),"wF86QhjrJtY6N8T2t", false)
//   // Liquid.initChart($('#chart'),"5huH969SKL3KcJsKN")
//   // Liquid.initChart($('#chart2'),"XFHDqpYSqmYJ5Xwy9")
// });

$(document).ready( function() {

  var chartInfo = {
    "_id" : "uccT5W5NHgTC4RuKk",
    "user" : {
      "id" : "XnJNitqzSkGzhxzMQ",
      "username" : "caleb"
    },
    "dataset" : {
      "id" : "JYWnxEsbtebp2xZdS",
      "name" : "Live Stormwater Experiment",
      "slug" : "live-stormwater-experiment",
      "username" : "caleb"
    },
    "chart" : {
      "regressionType" : "none",
      "label" : "Volume",
      "groupByField" : {
        "id" : "5a6585fa47da90f055e48e25",
        "label" : "Sensor ID"
      },
      "type" : "line",
      "aggregateBy" : "all",
      "yField" : {
        "id" : "1b81d9b44608334e77998c86",
        "label" : "Volume",
        "type" : "integer",
        "options" : null
      },
      "xField" : {
        "id" : "",
        "label" : "Submission Timestamp"
      }
    },
    "options" : {
      "title" : {
        "text" : "Rain Event: July 18, 2012"
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
          "min" : 0
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
          "opposite" : true
        }
      ]
    }
  };


  Liquid.init("getliquid.io", true);
  Liquid.initChart($('#chart'), chartInfo, true)
});
