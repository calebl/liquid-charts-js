this.Liquid = (function(){
  return {
    init: function(endpoint,ssl){
      this.ssl = ssl;
      this.endpoint = endpoint;
      this.connection = null;
      this.chartSub = null;
      this.charts = null;
      this.data = [];


      this.connect();
    },
    connect: function(){

      self = this;
      self.connection = new Asteroid(this.endpoint, this.ssl);
      self.connection.on("connected", function() {
        console.log("Connected.");

        self.charts = self.connection.getCollection("charts");
        if(!self.connection.loggedIn) {
          self.connection.loginWithPassword('caleb', 'n03xcus3s');
        }
      });
      self.connection.on("login", function() {
        console.log('logged in');

        // var chartSub = self.connection.subscribe("chart", chartId);
        //
        //
        // chartSub.ready.then(
        //   //onFulfilled
        //   function(result){
        //     self.connection.call("Charts.getData","uccT5W5NHgTC4RuKk","JYWnxEsbtebp2xZdS").result.then(
        //       function fulfilled(result){
        //         console.log('success');
        //         console.log(result);
        //
        //         self.records = result;
        //       },
        //       function rejected(reason){
        //         console.log('error!');
        //         console.log(reason);
        //       }
        //     )
        //   },
        //
        //   //onRejected
        //   function(error){
        //
        //   }
        // );


      });
      self.connection.on("logout", function() {
        console.log("logged out");
        self.chartSub.stop()

      });
    },
    initChart: function(element, chartInfo, useHighStocks) {
      var $element = $(element);

      self.connection.on("login", function() {
        console.log('logged in');


        var chartingHelper = new ChartBuilder(chartInfo.dataset, chartInfo.chart);
        var options = chartingHelper.getOptions([]);
        if (chartInfo.options) {
          _.extend(options, chartInfo.options);
        }
        if (useHighStocks === true) {
          $element.highcharts('StockChart', options)
        } else {
          $element.highcharts(options)
        }
        var highchart = $element.highcharts();

        self.connection.call("Charts.getData", chartInfo.chart, chartInfo.dataset.id).result.then(
          function fulfilled(result) {
            console.log('chart data found');
            console.log(result);

            self.data = result.data;

            var seriesData = chartInfo.data;

            if (seriesData) {
              for (var i = 0; i < seriesData.length; i++) {
                var data = seriesData[i];
                var seriesName = data.id;
                var chartSeries = highchart.get(seriesName);
                if (chartSeries) {
                  chartSeries.setData(data.data);
                } else {
                  highchart.addSeries(data);
                }
              }
            }
          },
          function rejected(reason) {
            console.log('error!');
            console.log(reason);
          }
        )


      });
    }
  }
})();
