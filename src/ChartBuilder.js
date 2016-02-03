//DO NOT modify this file. Changes to this class should be made in the Liquid mainline

this.ChartBuilder = (function() {
  ChartBuilder.colors = ['#47a9be', '#be5c47', '#47be98', '#476ebe', '#be9847', '#be476e', '#a9be47', '#be47a9', '#47be5c'];

  function ChartBuilder(set1, chart1, idArray1) {
    this.set = set1;
    this.chart = chart1;
    this.idArray = idArray1 != null ? idArray1 : [];
  }

  ChartBuilder.prototype.getIdArray = function() {
    return this.idArray;
  };

  ChartBuilder.prototype.processAggregateData = function(dataArray) {
    var categories, chart, data, options, self, series, seriesName, xAxis, yAxis;
    chart = this.chart;
    options = this.getOptions();
    xAxis = options.xAxis;
    yAxis = options.yAxis;
    categories = null;
    if (chart.yField.type === Form.FieldTypes.CHOICE || chart.type === 'bar') {
      categories = xAxis.categories;
    }
    self = this;
    series = [];
    data = [];
    _.each(dataArray, function(d) {
      return data.push([d.date.valueOf(), d.total]);
    });
    seriesName = chart.label;
    series.push({
      id: seriesName,
      name: seriesName,
      color: ChartBuilder.colors[series.length % ChartBuilder.colors.length],
      data: data
    });
    return series;
  };

  ChartBuilder.prototype.processRecords = function(records) {
    var categories, chart, cols, fields, idArray, options, self, series, xAxis, yAxis;
    chart = this.chart;
    options = this.getOptions();
    xAxis = options.xAxis;
    yAxis = options.yAxis;
    fields = ChartBuilder.getFields(records, chart.groupByField);
    cols = _.groupBy(fields, function(field) {
      return field.groupByValue;
    });
    categories = null;
    if (chart.yField.type === Form.FieldTypes.CHOICE || chart.type === 'bar') {
      categories = xAxis.categories;
    }
    self = this;
    idArray = this.idArray;
    series = [];
    _.each(cols, function(c, k) {
      var data, i, plotRegression, seriesIds, seriesName;
      data = [];
      if (chart.type === 'bar') {
        if (chart.yField.type === Form.FieldTypes.BOOLEAN) {
          data = [0, 0];
        } else if (Form.NumericFieldTypes.indexOf(chart.yField.type) > -1) {
          data = [0];
        } else if (chart.yField.type === Form.FieldTypes.CHOICE) {
          i = 0;
          while (i < categories.length) {
            data.push(0);
            i++;
          }
        }
      }
      _.each(c, function(resp) {
        var index, point, value;
        switch (chart.type) {
          case 'line':
          case 'scatter':
            point = self.getPoint(resp, chart.xField, chart.yField);
            if (point !== null && !_.isNaN(point.value)) {
              return data.push({
                id: resp.id,
                x: point.x,
                y: point.y
              });
            }
            break;
          case 'bar':
            point = _.findWhere(resp.response, {
              id: chart.yField.id
            });
            if (point && point !== null && (!_.isNaN(point.value))) {
              if (chart.yField.type === Form.FieldTypes.BOOLEAN) {
                value = Utils.processBooleanStr(point.value);
                if (value === true) {
                  return data[0] += 1;
                } else if (value === false) {
                  return data[1] += 1;
                }
              } else if (Form.NumericFieldTypes.indexOf(chart.yField.type) > -1) {
                value = parseFloat(point.value);
                if (!_.isNaN(value)) {
                  return data[0] += value;
                }
              } else if (chart.yField.type === Form.FieldTypes.CHOICE) {
                if (_.isArray(point.value)) {
                  return _.each(point.value, function(v) {
                    var index;
                    index = categories.indexOf(v);
                    if (index > -1) {
                      return data[index] += 1;
                    }
                  });
                } else {
                  index = categories.indexOf(point.value);
                  if (index > -1) {
                    return data[index] += 1;
                  }
                }
              }
            }
        }
      });
      if (chart.type === 'scatter' || chart.type === 'line') {
        data = _.sortBy(data, function(d) {
          return d.x;
        });
      }
      plotRegression = false;
      if (chart.regressionType && chart.regressionType !== "none") {
        plotRegression = true;
      }
      if (chart.groupByField) {
        seriesName = ChartBuilder.getSeriesName(chart.groupByField, k);
      } else {
        seriesName = chart.label;
      }
      seriesIds = [];
      _.each(data, function(value, i) {
        return seriesIds.push(value.id);
      });
      idArray.push({
        name: seriesName,
        ids: seriesIds
      });
      data = _.map(data, function(dataPoint) {
        if (chart.type !== 'bar') {
          return [dataPoint.x, dataPoint.y];
        } else {
          return [dataPoint];
        }
      });
      return series.push({
        id: seriesName,
        name: seriesName,
        color: ChartBuilder.colors[series.length % ChartBuilder.colors.length],
        data: data
      });
    });
    return series;
  };

  ChartBuilder.prototype.getOptions = function(idArray) {
    var chart, chartType, defaultOptions, options, self, set, xAxis, yAxis;
    set = this.set;
    chart = this.chart;
    defaultOptions = {
      title: {
        text: "",
        x: -20
      },
      credits: {
        enabled: false
      },
      colors: ChartBuilder.colors
    };
    options = {};
    chartType = chart.type;
    if (_.isUndefined(chartType)) {
      chartType = "line";
    }
    self = this;
    switch (chartType) {
      case 'bar':
        options = this.getBarChartOptions(chart);
        break;
      default:
        xAxis = ChartBuilder.getAxisInfo(chart.xField);
        yAxis = ChartBuilder.getAxisInfo(chart.yField);
        options = {
          xAxis: xAxis,
          yAxis: yAxis,
          plotOptions: {
            area: {
              turboThreshold: 2500
            },
            series: {
              cursor: 'pointer',
              enableMouseTracking: true,
              animation: false,
              point: {
                events: {
                  click: function() {
                    var idObject;
                    idObject = _.findWhere(idArray, {
                      name: this.series.name
                    });
                    if (idObject) {
                      return Router.go('showRecord', {
                        username: set.username,
                        slug: set.slug,
                        id: idObject.ids[this.series.data.indexOf(this)]
                      });
                    }
                  }
                }
              },
              events: {
                hide: function() {
                  if (this.chart.get(this.name + "-regression")) {
                    return this.chart.get(this.name + "-regression").hide();
                  }
                },
                show: function() {
                  if (this.chart.get(this.name + "-regression")) {
                    return this.chart.get(this.name + "-regression").show();
                  }
                }
              }
            }
          },
          tooltip: ChartBuilder.getTooltipFormatter(chart.xField, chart.yField, xAxis, yAxis),
          chart: {
            type: chartType,
            zoomType: 'x'
          }
        };
    }
    return _.extend(defaultOptions, options);
  };

  ChartBuilder.getFields = function(records, groupByField) {
    var fields;
    fields = [];
    if (_.isUndefined(groupByField) || _.isNull(groupByField) || groupByField === "") {
      fields = _.map(records, function(r) {
        return {
          id: r._id,
          createdAt: r.createdAt,
          response: r.response
        };
      });
    } else {
      if (groupByField && groupByField.id === 'liquidUserId') {
        fields = _.map(records, function(r) {
          return {
            id: r._id,
            groupByValue: r.user.username,
            createdAt: r.createdAt,
            response: r.response
          };
        });
      } else {
        fields = _.filter(records, function(r) {
          var gbv;
          gbv = _.findWhere(r.response, {
            id: groupByField.id
          });
          return !_.isUndefined(gbv);
        });
        fields = _.map(fields, function(r) {
          return {
            id: r._id,
            groupByValue: _.findWhere(r.response, {
              id: groupByField.id
            }).value,
            createdAt: r.createdAt,
            response: r.response
          };
        });
      }
    }
    return fields;
  };

  ChartBuilder.prototype.getPoint = function(response, xField, yField) {
    var xVal, yVal;
    xVal = response.createdAt.valueOf();
    if (!(_.isUndefined(xField) || _.isNull(xField) || xField.id === "")) {
      xVal = _.findWhere(response.response, {
        id: xField.id
      });
      if (xVal) {
        xVal = ChartBuilder.getFieldValue(xField.type, xVal.value);
      } else {
        return null;
      }
    }
    yVal = _.findWhere(response.response, {
      id: yField.id
    });
    if (yVal) {
      yVal = ChartBuilder.getFieldValue(yField.type, yVal.value);
    } else {
      return null;
    }
    if (_.isNaN(xVal) || _.isNaN(yVal)) {
      return null;
    }
    return {
      x: xVal,
      y: yVal
    };
  };

  ChartBuilder.getFieldValue = function(fieldType, value) {
    switch (fieldType) {
      case Form.FieldTypes.NUMBER:
      case Form.FieldTypes.CALCULATED_SUM:
      case Form.FieldTypes.LENGTH:
      case Form.FieldTypes.TEMPERATURE:
      case Form.FieldTypes.CALCULATED_QUOTIENT:
        return parseFloat(value);
      case Form.FieldTypes.DATE:
        return moment(value).valueOf();
      case Form.FieldTypes.TIME:
        return Date.parse('1-1-1 ' + value).valueOf();
    }
  };

  ChartBuilder.getSeriesName = function(groupByField, groupByValue, response) {
    var seriesName;
    if (response == null) {
      response = null;
    }
    if (groupByField && groupByField.id === 'liquidUserId') {
      return seriesName = groupByValue;
    } else {
      if (response !== null) {
        groupByValue = _.findWhere(response.response, {
          id: groupByField.id
        }).value;
      }
      if (!_.isNaN(groupByValue)) {
        return seriesName = groupByField.label + ": " + groupByValue;
      } else {
        return null;
      }
    }
  };

  ChartBuilder.prototype.getBarChartOptions = function(chart) {
    var aggregateBy, groupByField, shared, xAxis, xField, yField;
    yField = chart.yField;
    xField = chart.xField;
    groupByField = chart.groupByField;
    aggregateBy = chart.aggregateBy;
    xAxis = ChartBuilder.getAxisInfo(xField);
    shared = {
      chart: {
        type: 'column',
        zoomType: 'xy'
      },
      yAxis: {
        min: 0,
        title: {
          text: yField.label,
          align: 'high'
        },
        labels: {
          overflow: 'justify'
        }
      },
      xAxis: xAxis,
      plotOptions: {
        bar: {
          dataLabels: {
            enabled: true
          }
        },
        series: {
          animation: false
        }
      },
      legend: {
        maxHeight: 55
      },
      tooltip: {
        formatter: function() {
          var date, dateFormat, str, timestampFormat, verb, where;
          if (Form.NumericFieldTypes.indexOf(yField.type) > -1) {
            if (chart.aggregateBy) {
              dateFormat = 'MMM DD YYYY';
              timestampFormat = 'MMM DD YYYY h:mm a';
              date = moment.utc(this.x);
              switch (chart.aggregateBy) {
                case "day":
                  str = date.format(dateFormat) + ': <b>' + this.y + '</b>';
                  break;
                case "hour":
                  str = date.format(timestampFormat) + ': <b>' + this.y + '</b>';
                  break;
                default:
                  str = date + ': ' + this.y;
              }
            } else {
              str = this.x + ': ' + this.y;
            }
          } else {
            str = '<b>' + this.y + '</b> entries';
            if (_.isUndefined(yField.type.options)) {
              verb = 'is';
            } else {
              verb = 'includes';
            }
            where = '<br/>where <b>' + yField.label + '</b> ' + verb + ' <b>' + this.x + '</b>';
            if (this.series.name !== 'Series 1') {
              if (groupByField && groupByField.id === 'liquidUserId') {
                where += '<br/>and data submitted by <b>' + this.series.name + '</b>';
              } else {
                where += '<br/>and <b>' + this.series.name + '</b>';
              }
            }
            str += where;
          }
          return str;
        }
      }
    };
    switch (yField.type) {
      case Form.FieldTypes.BOOLEAN:
        _.extend(shared, {
          xAxis: {
            categories: ['yes', 'no'],
            title: {
              text: null
            }
          }
        });
        break;
      case Form.FieldTypes.NUMBER:
      case Form.FieldTypes.CALCULATED_SUM:
      case Form.FieldTypes.CALCULATED_QUOTIENT:
      case Form.FieldTypes.LENGTH:
      case Form.FieldTypes.TEMPERATURE:
        _.extend(shared, {
          xAxis: {
            categories: ['total'],
            title: {
              text: null
            }
          }
        });
        break;
      case Form.FieldTypes.CHOICE:
        _.extend(shared, {
          xAxis: {
            categories: _.map(yField.options, function(obj, index) {
              return obj.value;
            }),
            title: {
              text: null
            }
          }
        });
    }
    if (chart.aggregateBy) {
      return _.extend(shared, {
        xAxis: {
          type: 'datetime',
          title: {
            text: 'Time'
          }
        }
      });
    }
  };

  ChartBuilder.getAxisInfo = function(field) {
    if (_.isNull(field) || _.isUndefined(field) || _.isUndefined(field.id) || field.id === "") {
      return {
        type: 'datetime',
        title: {
          text: 'Time'
        }
      };
    } else {
      switch (field.type) {
        case Form.FieldTypes.DATE:
          return {
            type: 'datetime',
            title: {
              text: field.label
            }
          };
        case Form.FieldTypes.TIME:
          return {
            type: 'datetime',
            title: {
              text: field.label
            },
            dateTimeLabelFormats: {
              second: '%l:%M %P',
              minute: '%l:%M %P',
              hour: '%l:%M %P',
              day: '%l:%M %P',
              week: '%l:%M %P',
              month: '%l:%M %P',
              year: '%l:%M %P'
            }
          };
        default:
          return {
            type: 'linear',
            title: {
              text: field.label
            }
          };
      }
    }
  };

  ChartBuilder.getTooltipFieldLabel = function(axisType, field, value) {
    var date, dateFormat, timeFormat, timestampFormat;
    dateFormat = 'MMM DD YYYY';
    timestampFormat = 'MMM DD YYYY h:mm a';
    timeFormat = 'h:mm a';
    if (axisType === 'datetime') {
      date = moment.utc(value);
      if (field && field.type === Form.FieldTypes.DATE) {
        return field.label + ': <b>' + date.format(dateFormat) + '</b>';
      } else if (field && field.type === Form.FieldTypes.TIME) {
        return field.label + ': <b>' + date.format(timeFormat) + '</b>';
      } else {
        return date.format(timestampFormat);
      }
    } else {
      return field.label + ': <b>' + value + '</b>';
    }
  };

  ChartBuilder.getTooltipFormatter = function(xField, yField, xAxis, yAxis) {
    return {
      formatter: function() {
        var equation, header, rsq, x, y;
        header = '<span><b>' + this.series.name + '</b></span><br/>';
        if (this.series.options.isRegressionLine) {
          equation = '<span>' + "Equation: " + this.series.options.regressionOutputs.string + '</span>' + '<br/>';
          rsq = '<span>' + "r\xB2: " + this.series.options.regressionOutputs.rSquared + '</span>';
          return header + equation + rsq;
        } else {
          x = ChartBuilder.getTooltipFieldLabel(xAxis.type, xField, this.x) + '<br/>';
          y = ChartBuilder.getTooltipFieldLabel(yAxis.type, yField, this.y) + '<br/>';
          return header + x + y;
        }
      }
    };
  };

  return ChartBuilder;

})();

// ---
// generated by coffee-script 1.9.2
