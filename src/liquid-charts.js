this.Liquid = (function(){
  return {
    init: function(endpoint,ssl){
      this.ssl = ssl;
      this.endpoint = endpoint;
      this.connection = null;
      this.chartSub = null;
      this.charts = null;

      this.connect();
    },
    connect: function(){

      self = this
      self.connection = new Asteroid(this.endpoint, this.ssl);
      self.connection.on("connected", function() {
        console.log("Connected.");

        self.charts = self.connection.getCollection("charts");
      });
      self.connection.on("login", function() {

      });
      self.connection.on("logout", function() {
        console.log("logged out");
        self.chartSub.stop()

      });
    },
    initChart: function(element, chartId) {
      var $element = $(element)
      var chartSub = self.connection.subscribe("chart", chartId)


      chartSub.ready.then(
        //onFulfilled
        function(result){
          // var highchart = $element.highcharts()

          var updateChart = function(query){
            if(query.result.length > 0) {
              var chartInfo = query.result[0];

              var chartingHelper = new ChartBuilder(chartInfo.dataset, chartInfo.chart)
              var idArray = chartInfo.idArray
              var options = chartingHelper.getOptions(idArray)
              if(chartInfo.yAxis){
                options["yAxis"] = chartInfo.yAxis;
                options["tooltip"] = {shared: true};
              }
              $element.highcharts(options)
              var highchart = $element.highcharts()

              var seriesData = chartInfo.data

              if ( seriesData ) {
                for (var i=0; i< seriesData.length; i++ ) {
                  var data = seriesData[i]
                  var seriesName = data.id;
                  var chartSeries = highchart.get( seriesName );
                  if ( chartSeries ){
                    chartSeries.setData( data.data );
                  } else {
                    highchart.addSeries( data );
                  }
                }
              }
            }
          }

          var query = self.charts.reactiveQuery({_id: chartId})
          query.on("change", function(id){
            updateChart(query);
          });

          updateChart(query);



        },
        //onRejected
        function(err) {
          console.log(err);
        }
      );
    }
  }
})();
