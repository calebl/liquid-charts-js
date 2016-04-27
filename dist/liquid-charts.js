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
        id: new Meteor.Collection.ObjectID().toHexString(),
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
                        _id: set.id,
                        recordNumber: idObject.ids[this.series.data.indexOf(this)]
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
          id: r.recordNumber,
          createdAt: r.createdAt,
          response: r.response
        };
      });
    } else {
      if (groupByField && groupByField.id === 'liquidUserId') {
        fields = _.map(records, function(r) {
          return {
            id: r.recordNumber,
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
            id: r.recordNumber,
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
      _.extend(shared, {
        xAxis: {
          type: 'datetime',
          title: {
            text: 'Time'
          }
        }
      });
    }

    return shared;
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
        if(!_.isUndefined(this.series)){
          header = '<span><b>' + this.series.name + '</b></span><br/>';

          if (this.series.options.isRegressionLine) {
            equation = '<span>' + "Equation: " + this.series.options.regressionOutputs.string + '</span>' + '<br/>';
            rsq = '<span>' + "r\xB2: " + this.series.options.regressionOutputs.rSquared + '</span>';
            return header + equation + rsq;
          }
        } else {
          header="";
        }

        x = ChartBuilder.getTooltipFieldLabel(xAxis.type, xField, this.x) + '<br/>';
        y = ChartBuilder.getTooltipFieldLabel(yAxis.type, yField, this.y) + '<br/>';
        return header + x + y;
      }
    };
  };

  return ChartBuilder;

})();

// ---
// generated by coffee-script 1.9.2

//DO NOT modify this file. Bring changes in from Liquid mainline

this.Form = (function() {
  function Form() {}

  Form.FieldTypes = {
    NUMBER: 'integer',
    STRING: 'string',
    CHOICE: 'choice',
    PHOTO: 'photo',
    BOOLEAN: 'boolean',
    SECTION: 'section',
    DATE: 'date',
    TIME: 'time',
    LOCATION: 'location',
    LENGTH: 'length',
    TEMPERATURE: "temperature",
    CALCULATED_SUM: 'calculatedSum',
    CALCULATED_QUOTIENT: 'calculatedQuotient'
  };

  Form.NumericFieldTypes = [Form.FieldTypes.NUMBER, Form.FieldTypes.LENGTH, Form.FieldTypes.TEMPERATURE, Form.FieldTypes.CALCULATED_SUM, Form.FieldTypes.CALCULATED_QUOTIENT];

  return Form;

})();

// ---
// generated by coffee-script 1.9.2

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(factory);
    } else if (typeof exports === "object") {
        module.exports = factory();
    } else {
        root.Asteroid = factory();
    }
}(this, function () {

"use strict";

//////////////////////////
// Asteroid constructor //
//////////////////////////

var Asteroid = function (host, ssl, socketInterceptFunction, instanceId) {
	// Assert arguments type
	Asteroid.utils.must.beString(host);
	// An id may be assigned to the instance. This is to support
	// resuming login of multiple connections to the same host.
	this._instanceId = instanceId || "0";
	// Configure the instance
	this._host = (ssl ? "https://" : "http://") + host;
	// Reference containers
	this.collections = {};
	this.subscriptions = {};
	this._subscriptionsCache = {};
	// Set __ddpOptions
	this._setDdpOptions(host, ssl, socketInterceptFunction);
	// Init the instance
	this._init();
};

/*
 *	Aftermarket implementation of the btoa function, since IE9 does not
 *	support it.
 *
 *	Code partly taken from:
 *	https://github.com/meteor/meteor/blob/devel/packages/base64/base64.js
 *	Copyright (C) 2011--2014 Meteor Development Group
 */

if (!Asteroid.utils) {
	Asteroid.utils = {};
}
Asteroid.utils.btoa = (function () {

	var BASE_64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

	var getChar = function (val) {
		return BASE_64_CHARS.charAt(val);
	};

	var newBinary = function (len) {
		var ret = [];
		for (var i = 0; i < len; i++) {
			ret.push(0);
		}
		return ret;
	};

	return function (array) {

		if (typeof array === "string") {
			var str = array;
			array = newBinary(str.length);
			for (var j = 0; j < str.length; j++) {
				var ch = str.charCodeAt(j);
				if (ch > 0xFF) {
					throw new Error("Not ascii. Base64.encode can only take ascii strings");
				}
				array[j] = ch;
			}
		}

		var answer = [];
		var a = null;
		var b = null;
		var c = null;
		var d = null;
		for (var i = 0; i < array.length; i++) {
			switch (i % 3) {
				case 0:
					a = (array[i] >> 2) & 0x3F;
					b = (array[i] & 0x03) << 4;
					break;
				case 1:
					b = b | (array[i] >> 4) & 0xF;
					c = (array[i] & 0xF) << 2;
					break;
				case 2:
					c = c | (array[i] >> 6) & 0x03;
					d = array[i] & 0x3F;
					answer.push(getChar(a));
					answer.push(getChar(b));
					answer.push(getChar(c));
					answer.push(getChar(d));
					a = null;
					b = null;
					c = null;
					d = null;
					break;
			}
		}
		if (a !== null) {
			answer.push(getChar(a));
			answer.push(getChar(b));
			if (c === null) {
				answer.push("=");
			} else {
				answer.push(getChar(c));
			}
			if (d === null) {
				answer.push("=");
			}
		}
		return answer.join("");
	};

})();

if (!Asteroid.utils) {
	Asteroid.utils = {};
}
Asteroid.utils.clone = function (obj) {
	if (typeof EJSON !== "undefined") {
		return EJSON.clone(obj);
	}
	var type = typeof obj;
	switch (type) {
		case "undefined":
		case "function":
			return undefined;
		case "string":
		case "number":
		case "boolean":
			return obj;
		case "object":
			if (obj === null) {
				return null;
			}
			return JSON.parse(JSON.stringify(obj));
		default:
			return;
	}
};

if (!Asteroid.utils) {
	Asteroid.utils = {};
}
Asteroid.utils.EventEmitter = function () {};

Asteroid.utils.EventEmitter.prototype = {

	constructor: Asteroid.utils.EventEmitter,

	on: function (name, handler) {
		if (!this._events) this._events = {};
		this._events[name] = this._events[name] || [];
		this._events[name].push(handler);
	},

	off: function (name, handler) {
		if (!this._events) this._events = {};
		if (!this._events[name]) return;
		this._events[name].splice(this._events[name].indexOf(handler), 1);
	},

	_emit: function (name /* , arguments */) {
		if (!this._events) this._events = {};
		if (!this._events[name]) return;
		var args = arguments;
		var self = this;
		this._events[name].forEach(function (handler) {
			handler.apply(self, Array.prototype.slice.call(args, 1));
		});
	}

};

if (!Asteroid.utils) {
	Asteroid.utils = {};
}
Asteroid.utils.getFilterFromSelector = function (selector) {

	// Get the value of the object from a compund key
	// (e.g. "profile.name.first")
	var getItemVal = function (item, key) {
		return key.split(".").reduce(function (prev, curr) {
			if (!prev) {
				return prev;
			}
			prev = prev[curr];
			return prev;
		}, item);
	};

	var keys = Object.keys(selector);

	var filters = keys.map(function (key) {

		var subFilters;
		if (key === "$and") {
			subFilters = selector[key].map(Asteroid.utils.getFilterFromSelector);
			return function (item) {
				return subFilters.reduce(function (acc, subFilter) {
					if (!acc) {
						return acc;
					}
					return subFilter(item);
				}, true);
			};
		}

		if (key === "$or") {
			subFilters = selector[key].map(Asteroid.utils.getFilterFromSelector);
			return function (item) {
				return subFilters.reduce(function (acc, subFilter) {
					if (acc) {
						return acc;
					}
					return subFilter(item);
				}, false);
			};
		}

		if (key === "$nor") {
			subFilters = selector[key].map(Asteroid.utils.getFilterFromSelector);
			return function (item) {
				return subFilters.reduce(function (acc, subFilter) {
					if (!acc) {
						return acc;
					}
					return !subFilter(item);
				}, true);
			};
		}

		return function (item) {
			var itemVal = getItemVal(item, key);
			return itemVal === selector[key];
		};


	});

	// Return the filter function
	return function (item) {

		// Filter out backups
		if (item._id && is_backup(item._id)) {
			return false;
		}

		return filters.reduce(function (acc, filter) {
			if (!acc) {
				return acc;
			}
			return filter(item);
		}, true);

	};
};

if (!Asteroid.utils) {
	Asteroid.utils = {};
}
Asteroid.utils.formQs = function (obj) {
	var qs = "";
	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			qs += encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]) + "&";
		}
	}
	qs = qs.slice(0, -1);
	return qs;
};

if (!Asteroid.utils) {
	Asteroid.utils = {};
}
Asteroid.utils.getOauthState = function (credentialToken) {
	var state = {
		loginStyle: "popup",
		credentialToken: credentialToken,
		isCordova: false
	};
	// Encode base64 as not all login services URI-encode the state
	// parameter when they pass it back to us.
	return Asteroid.utils.btoa(JSON.stringify(state));
};

if (!Asteroid.utils) {
	Asteroid.utils = {};
}
Asteroid.utils.guid = function () {
	var ret = "";
	for (var i=0; i<8; i++) {
		ret += Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
	return ret;
};

if (!Asteroid.utils) {
	Asteroid.utils = {};
}
Asteroid.utils.isEmail = function (string) {
	return string.indexOf("@") !== -1;
};

if (!Asteroid.utils) {
	Asteroid.utils = {};
}
Asteroid.utils.isEqual = function (obj1, obj2) {
	var str1 = JSON.stringify(obj1);
	var str2 = JSON.stringify(obj2);
	return str1 === str2;
};

if (!Asteroid.utils) {
	Asteroid.utils = {};
}
Asteroid.utils.multiStorage = {};

if (!Asteroid.utils) {
	Asteroid.utils = {};
}
Asteroid.utils.must = {

	_toString: function (thing) {
		return Object.prototype.toString.call(thing).slice(8, -1);
	},

	beString: function (s) {
		var type = this._toString(s);
		if (type !== "String") {
			throw new Error("Assertion failed: expected String, instead got " + type);
		}
	},

	beArray: function (o) {
		var type = this._toString(o);
		if (type !== "Array") {
			throw new Error("Assertion failed: expected Array, instead got " + type);
		}
	},

	beObject: function (o) {
		var type = this._toString(o);
		if (type !== "Object") {
			throw new Error("Assertion failed: expected Object, instead got " + type);
		}
	}

};

// Asteroid instances are EventEmitter-s
Asteroid.prototype = Object.create(Asteroid.utils.EventEmitter.prototype);
Asteroid.prototype.constructor = Asteroid;



////////////////////////////////
// Establishes the connection //
////////////////////////////////

Asteroid.prototype._init = function () {
	var self = this;
	// Creates the DDP instance, that will automatically
	// connect to the DDP server.
	self.ddp = new DDP(this._ddpOptions);
	// Register handlers
	self.ddp.on("connected", function () {
		// Upon connection try resuming login
		// Save the pormise it returns
		self.resumeLoginPromise = self._tryResumeLogin();
		// Subscribe to the meteor.loginServiceConfiguration
		// collection, which holds the configuration options
		// to login via third party services (oauth).
		self.subscribe("meteor.loginServiceConfiguration");
		// Emit the connected event
		self._emit("connected");
	});
	self.ddp.on("reconnected", function () {
		// Upon reconnection try resuming login
		// Save the pormise it returns
		self.resumeLoginPromise = self._tryResumeLogin();
		// Re-establish all previously established (and still active) subscriptions
		self._reEstablishSubscriptions();
		// Emit the reconnected event
		self._emit("reconnected");
	});
	self.ddp.on("added", function (data) {
		self._onAdded(data);
	});
	self.ddp.on("changed", function (data) {
		self._onChanged(data);
	});
	self.ddp.on("removed", function (data) {
		self._onRemoved(data);
	});
};



//////////////////////////////////////////////////////////////////
// Handlers for the ddp "added", "removed" and "changed" events //
//////////////////////////////////////////////////////////////////

Asteroid.prototype._onAdded = function (data) {
	// Get the name of the collection
	var cName = data.collection;
	// If the collection does not exist yet, create it
	if (!this.collections[cName]) {
		this.collections[cName] = new Asteroid._Collection(cName, this);
	}
	// data.fields can be undefined if the item added has only
	// the _id field . To avoid errors down the line, ensure item
	// is an object.
	var item = data.fields || {};
	item._id = data.id;
	// Perform the remote insert
	this.collections[cName]._remoteToLocalInsert(item);
};

Asteroid.prototype._onRemoved = function (data) {
	// Check the collection exists to avoid exceptions
	if (!this.collections[data.collection]) {
		return;
	}
	// Perform the reomte remove
	this.collections[data.collection]._remoteToLocalRemove(data.id);
};

Asteroid.prototype._onChanged = function (data) {
	// Check the collection exists to avoid exceptions
	if (!this.collections[data.collection]) {
		return;
	}
	// data.fields can be undefined if the update only
	// removed some properties in the item. Make sure
	// it's an object
	if (!data.fields) {
		data.fields = {};
	}
	// If there were cleared fields, explicitly set them
	// to undefined in the data.fields object. This will
	// cause those fields to be present in the for ... in
	// loop the remote update method of the collection
	// performs, causing then the fields to be actually
	// cleared from the item
	if (data.cleared) {
		data.cleared.forEach(function (key) {
			data.fields[key] = undefined;
		});
	}
	// Perform the remote update
	this.collections[data.collection]._remoteToLocalUpdate(data.id, data.fields);
};



////////////////////////////
// Call and apply methods //
////////////////////////////

Asteroid.prototype.call = function (method /* , param1, param2, ... */) {
	// Assert arguments type
	Asteroid.utils.must.beString(method);
	// Get the parameters for apply
	var params = Array.prototype.slice.call(arguments, 1);
	// Call apply
	return this.apply(method, params);
};

Asteroid.prototype.apply = function (method, params) {
	// Assert arguments type
	Asteroid.utils.must.beString(method);
	// If no parameters are given, use an empty array
	if (!Array.isArray(params)) {
		params = [];
	}
	// Create the result and updated promises
	var resultDeferred = Q.defer();
	var updatedDeferred = Q.defer();
	var onResult = function (err, res) {
		// The onResult handler takes care of errors
		if (err) {
			// If errors ccur, reject both promises
			resultDeferred.reject(err);
			updatedDeferred.reject();
		} else {
			// Otherwise resolve the result one
			resultDeferred.resolve(res);
		}
	};
	var onUpdated = function () {
		// Just resolve the updated promise
		updatedDeferred.resolve();
	};
	// Perform the method call
	this.ddp.method(method, params, onResult, onUpdated);
	// Return an object containing both promises
	return {
		result: resultDeferred.promise,
		updated: updatedDeferred.promise
	};
};



/////////////////////
// Syntactic sugar //
/////////////////////

Asteroid.prototype.getCollection = function (name) {
	// Assert arguments type
	Asteroid.utils.must.beString(name);
	// Only create the collection if it doesn't exist
	if (!this.collections[name]) {
		this.collections[name] = new Asteroid._Collection(name, this);
	}
	return this.collections[name];
};

///////////////////////////////////////////
// Removal and update suffix for backups //
///////////////////////////////////////////

var mf_removal_suffix = "__del__";
var mf_update_suffix = "__upd__";
var is_backup = function (id) {
	var l1 = mf_removal_suffix.length;
	var l2 = mf_update_suffix.length;
	var s1 = id.slice(-1 * l1);
	var s2 = id.slice(-1 * l2);
	return s1 === mf_removal_suffix || s2 === mf_update_suffix;
};



/////////////////////////////////////////////
// Collection class constructor definition //
/////////////////////////////////////////////

var Collection = function (name, asteroidRef) {
	this.name = name;
	this.asteroid = asteroidRef;
	this._set = new Set();
};
Collection.prototype.constructor = Collection;



///////////////////////////////////////////////
// Insert-related private and public methods //
///////////////////////////////////////////////

Collection.prototype._localToLocalInsert = function (item) {
	// If an item by that id already exists, raise an exception
	if (this._set.contains(item._id)) {
		throw new Error("Item " + item._id + " already exists");
	}
	this._set.put(item._id, item);
	// Return a promise, just for api consistency
	return Q(item._id);
};
Collection.prototype._remoteToLocalInsert = function (item) {
	// The server is the SSOT, add directly
	this._set.put(item._id, item);
};
Collection.prototype._localToRemoteInsert = function (item) {
	var self = this;
	var deferred = Q.defer();
	// Construct the name of the method we need to call
	var methodName = "/" + self.name + "/insert";
	self.asteroid.ddp.method(methodName, [item], function (err, res) {
		if (err) {
			// On error restore the database and reject the promise
			self._set.del(item._id);
			deferred.reject(err);
		} else {
			// Else resolve the promise
			deferred.resolve(item._id);
		}
	});
	return deferred.promise;
};
Collection.prototype.insert = function (item) {
	// If the time has no id, generate one for it
	if (!item._id) {
		item._id = Asteroid.utils.guid();
	}
	return {
		// Perform the local insert
		local: this._localToLocalInsert(item),
		// Send the insert request
		remote: this._localToRemoteInsert(item)
	};
};



///////////////////////////////////////////////
// Remove-related private and public methods //
///////////////////////////////////////////////

Collection.prototype._localToLocalRemove = function (id) {
	// Check if the item exists in the database
	var existing = this._set.get(id);
	if (existing) {
		// Create a backup of the object to delete
		this._set.put(id + mf_removal_suffix, existing);
		// Delete the object
		this._set.del(id);
	}
	// Return a promise, just for api consistency
	return Q(id);
};
Collection.prototype._remoteToLocalRemove = function (id) {
	// The server is the SSOT, remove directly (item and backup)
	this._set.del(id);
};
Collection.prototype._localToRemoteRemove = function (id) {
	var self = this;
	var deferred = Q.defer();
	// Construct the name of the method we need to call
	var methodName = "/" + self.name + "/remove";
	self.asteroid.ddp.method(methodName, [{_id: id}], function (err, res) {
		if (err) {
			// On error restore the database and reject the promise
			var backup = self._set.get(id + mf_removal_suffix);
			// Ensure there is a backup
			if (backup) {
				self._set.put(id, backup);
				self._set.del(id + mf_removal_suffix);
			}
			deferred.reject(err);
		} else {
			// Else, delete the (possible) backup and resolve the promise
			self._set.del(id + mf_removal_suffix);
			deferred.resolve(id);
		}
	});
	return deferred.promise;
};
Collection.prototype.remove = function (id) {
	return {
		// Perform the local remove
		local: this._localToLocalRemove(id),
		// Send the remove request
		remote: this._localToRemoteRemove(id)
	};
};



///////////////////////////////////////////////
// Update-related private and public methods //
///////////////////////////////////////////////

Collection.prototype._localToLocalUpdate = function (id, fields) {
	// Ensure the item actually exists
	var existing = this._set.get(id);
	if (!existing) {
		throw new Error("Item " + id + " doesn't exist");
	}
	// Ensure the _id property won't get modified
	if (fields._id && fields._id !== id) {
		throw new Error("Modifying the _id of a document is not allowed");
	}
	// Create a backup
	this._set.put(id + mf_update_suffix, existing);
	// Perform the update
	for (var field in fields) {
		if (fields.hasOwnProperty(field)) {
			existing[field] = fields[field];
		}
	}
	this._set.put(id, existing);
	// Return a promise, just for api consistency
	return Q(id);
};
Collection.prototype._remoteToLocalUpdate = function (id, fields) {
	// Ensure the item exixts in the database
	var existing = this._set.get(id);
	if (!existing) {
		console.warn("Server misbehaviour: item " + id + " doesn't exist");
		return;
	}
	for (var field in fields) {
		// Ensure the server is not trying to moify the item _id
		if (field === "_id" && fields._id !== id) {
			console.warn("Server misbehaviour: modifying the _id of a document is not allowed");
			return;
		}
		existing[field] = fields[field];
	}
	// Perform the update
	this._set.put(id, existing);
};
Collection.prototype._localToRemoteUpdate = function (id, fields) {
	var self = this;
	var deferred = Q.defer();
	// Construct the name of the method we need to call
	var methodName = "/" + self.name + "/update";
	// Construct the selector
	var sel = {
		_id: id
	};
	// Construct the modifier
	var mod = {
		$set: fields
	};
	self.asteroid.ddp.method(methodName, [sel, mod], function (err, res) {
		if (err) {
			// On error restore the database and reject the promise
			var backup = self._set.get(id + mf_update_suffix);
			self._set.put(id, backup);
			self._set.del(id + mf_update_suffix);
			deferred.reject(err);
		} else {
			// Else, delete the (possible) backup and resolve the promise
			self._set.del(id + mf_update_suffix);
			deferred.resolve(id);
		}
	});
	return deferred.promise;
};
Collection.prototype.update = function (id, fields) {
	return {
		// Perform the local update
		local: this._localToLocalUpdate(id, fields),
		// Send the update request
		remote: this._localToRemoteUpdate(id, fields)
	};
};



//////////////////////////////
// Reactive queries methods //
//////////////////////////////

var ReactiveQuery = function (set) {
	var self = this;
	self.result = [];

	self._set = set;
	self._getResult();

	self._set.on("put", function (id) {
		self._getResult();
		self._emit("change", id);
	});
	self._set.on("del", function (id) {
		self._getResult();
		self._emit("change", id);
	});

};
ReactiveQuery.prototype = Object.create(Asteroid.utils.EventEmitter.prototype);
ReactiveQuery.constructor = ReactiveQuery;

ReactiveQuery.prototype._getResult = function () {
	this.result = this._set.toArray();
};

Collection.prototype.reactiveQuery = function (selectorOrFilter) {
	var filter;
	if (typeof selectorOrFilter === "function") {
		filter = selectorOrFilter;
	} else {
		filter = Asteroid.utils.getFilterFromSelector(selectorOrFilter);
	}
	var subset = this._set.filter(filter);
	return new ReactiveQuery(subset);
};



Asteroid._Collection = Collection;

Asteroid.prototype._getOauthClientId = function (serviceName) {
	var loginConfigCollectionName = "meteor_accounts_loginServiceConfiguration";
	var loginConfigCollection = this.collections[loginConfigCollectionName];
	var service = loginConfigCollection.reactiveQuery({service: serviceName}).result[0];
	return service.clientId || service.consumerKey || service.appId;
};

Asteroid.prototype._loginAfterCredentialSecretReceived = function (credentials) {
	var self = this;
	var deferred = Q.defer();
	var loginParameters = {
		oauth: credentials
	};
	self.ddp.method("login", [loginParameters], function (err, res) {
		if (err) {
			delete self.userId;
			delete self.loggedIn;
			Asteroid.utils.multiStorage.del(self._host + "__" + self._instanceId + "__login_token__");
			deferred.reject(err);
			self._emit("loginError", err);
		} else {
			self.userId = res.id;
			self.loggedIn = true;
			Asteroid.utils.multiStorage.set(self._host + "__" + self._instanceId + "__login_token__", res.token);
			self._emit("login", res.id);
			deferred.resolve(res.id);
		}
	});
	return deferred.promise;
};

Asteroid.prototype._connectAfterCredentialSecretReceived = function (credentials) {
	var deferred = Q.defer();
	var loginParameters = {
		oauth: credentials
	};
	this.ddp.method("addLoginService", [loginParameters], function (err, res) {
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve();
		}
	});
	return deferred.promise;
};

Asteroid.prototype._tryResumeLogin = function () {
	var self = this;
	return Q()
		.then(function () {
			return Asteroid.utils.multiStorage.get(self._host + "__" + self._instanceId + "__login_token__");
		})
		.then(function (token) {
			if (!token) {
				throw new Error("No login token");
			}
			return token;
		})
		.then(function (token) {
			var deferred = Q.defer();
			var loginParameters = {
				resume: token
			};
			self.ddp.method("login", [loginParameters], function (err, res) {
				if (err) {
					delete self.userId;
					delete self.loggedIn;
					Asteroid.utils.multiStorage.del(self._host + "__" + self._instanceId + "__login_token__");
					self._emit("loginError", err);
					deferred.reject(err);
				} else {
					self.userId = res.id;
					self.loggedIn = true;
					Asteroid.utils.multiStorage.set(self._host + "__" + self._instanceId + "__login_token__", res.token);
					self._emit("login", res.id);
					deferred.resolve(res.id);
				}
			});
			return deferred.promise;
		});
};

Asteroid.prototype.createUser = function (usernameOrEmail, password, profile) {
	var self = this;
	var deferred = Q.defer();
	var options;
	if (typeof usernameOrEmail === "string") {
		options = {
			username: Asteroid.utils.isEmail(usernameOrEmail) ? undefined : usernameOrEmail,
			email: Asteroid.utils.isEmail(usernameOrEmail) ? usernameOrEmail : undefined,
			password: password,
			profile: profile
		};
	} else if (typeof usernameOrEmail === "object") {
		options = usernameOrEmail;
	}
	self.ddp.method("createUser", [options], function (err, res) {
		if (err) {
			self._emit("createUserError", err);
			deferred.reject(err);
		} else {
			self.userId = res.id;
			self.loggedIn = true;
			Asteroid.utils.multiStorage.set(self._host + "__" + self._instanceId + "__login_token__", res.token);
			self._emit("createUser", res.id);
			self._emit("login", res.id);
			deferred.resolve(res.id);
		}
	});
	return deferred.promise;
};

Asteroid.prototype.loginWithPassword = function (usernameOrEmail, password) {
	var self = this;
	var deferred = Q.defer();
	var loginParameters = {
		password: password,
		user: {
			username: Asteroid.utils.isEmail(usernameOrEmail) ? undefined : usernameOrEmail,
			email: Asteroid.utils.isEmail(usernameOrEmail) ? usernameOrEmail : undefined
		}
	};
	self.ddp.method("login", [loginParameters], function (err, res) {
		if (err) {
			delete self.userId;
			delete self.loggedIn;
			Asteroid.utils.multiStorage.del(self._host + "__" + self._instanceId + "__login_token__");
			deferred.reject(err);
			self._emit("loginError", err);
		} else {
			self.userId = res.id;
			self.loggedIn = true;
			Asteroid.utils.multiStorage.set(self._host + "__" + self._instanceId + "__login_token__", res.token);
			self._emit("login", res.id);
			deferred.resolve(res.id);
		}
	});
	return deferred.promise;
};

Asteroid.prototype.logout = function () {
	var self = this;
	var deferred = Q.defer();
	self.ddp.method("logout", [], function (err) {
		if (err) {
			self._emit("logoutError", err);
			deferred.reject(err);
		} else {
			delete self.userId;
			delete self.loggedIn;
			Asteroid.utils.multiStorage.del(self._host + "__" + self._instanceId + "__login_token__");
			self._emit("logout");
			deferred.resolve();
		}
	});
	return deferred.promise;
};

var Set = function (readonly) {
	// Allow readonly sets
	if (readonly) {
		// Make the put and del methods private
		this._put = this.put;
		this._del = this.del;
		// Replace them with a throwy function
		this.put = this.del = function () {
			throw new Error("Attempt to modify readonly set");
		};
	}
	this._items = {};
};
// Inherit from EventEmitter
Set.prototype = Object.create(Asteroid.utils.EventEmitter.prototype);
Set.constructor = Set;

Set.prototype.put = function (id, item) {
	// Assert arguments type
	Asteroid.utils.must.beString(id);
	Asteroid.utils.must.beObject(item);
	// Save a clone to avoid collateral damage
	this._items[id] = Asteroid.utils.clone(item);
	this._emit("put", id);
	// Return the set instance to allow method chainging
	return this;
};

Set.prototype.del = function (id) {
	// Assert arguments type
	Asteroid.utils.must.beString(id);
	delete this._items[id];
	this._emit("del", id);
	// Return the set instance to allow method chainging
	return this;
};

Set.prototype.get = function (id) {
	// Assert arguments type
	Asteroid.utils.must.beString(id);
	// Return a clone to avoid collateral damage
	return Asteroid.utils.clone(this._items[id]);
};

Set.prototype.contains = function (id) {
	// Assert arguments type
	Asteroid.utils.must.beString(id);
	return !!this._items[id];
};

Set.prototype.filter = function (belongFn) {

	// Creates the subset
	var sub = new Set(true);

	// Keep a reference to the _items hash
	var items = this._items;

	// Performs the initial puts
	var ids = Object.keys(items);
	ids.forEach(function (id) {
		// Clone the element to avoid
		// collateral damage
		var itemClone = Asteroid.utils.clone(items[id]);
		var belongs = belongFn(itemClone);
		if (belongs) {
			sub._items[id] = items[id];
		}
	});

	// Listens to the put and del events
	// to automatically update the subset
	this.on("put", function (id) {
		// Clone the element to avoid
		// collateral damage
		var itemClone = Asteroid.utils.clone(items[id]);
		var belongs = belongFn(itemClone);
		if (belongs) {
			sub._put(id, items[id]);
		}
	});
	this.on("del", function (id) {
		sub._del(id);
	});

	// Returns the subset
	return sub;
};

Set.prototype.toArray = function () {
	var array = [];
	var items = this._items;
	var ids = Object.keys(this._items);
	ids.forEach(function (id) {
		array.push(items[id]);
	});
	// Return a clone to avoid collateral damage
	return Asteroid.utils.clone(array);
};

Set.prototype.toHash = function () {
	// Return a clone to avoid collateral damage
	return Asteroid.utils.clone(this._items);
};

Asteroid.Set = Set;

////////////////////////
// Subscription class //
////////////////////////

var Subscription = function (name, params, fingerprint, asteroid) {
	this._name = name;
	this._params = params;
	this._fingerprint = fingerprint;
	this._asteroid = asteroid;
	// Subscription promises
	this._ready = Q.defer();
	this.ready = this._ready.promise;
	// Subscribe via DDP
	var or = this._onReady.bind(this);
	var os = this._onStop.bind(this);
	var oe = this._onError.bind(this);
	this.id = asteroid.ddp.sub(name, params, or, os, oe);
};
Subscription.constructor = Subscription;

Subscription.prototype.stop = function () {
	this._asteroid.ddp.unsub(this.id);
	delete this._asteroid._subscriptionsCache[this._fingerprint];
};

Subscription.prototype._onReady = function () {
	this._ready.resolve(this.id);
};

Subscription.prototype._onStop = function () {
	delete this._asteroid.subscriptions[this.id];
	delete this._asteroid._subscriptionsCache[this._fingerprint];
};

Subscription.prototype._onError = function (err) {
	if (this.ready.isPending()) {
		this._ready.reject(err);
	}
	delete this._asteroid.subscriptions[this.id];
	delete this._asteroid._subscriptionsCache[this._fingerprint];
};



//////////////////////
// Subscribe method //
//////////////////////

Asteroid.prototype.subscribe = function (name /* , param1, param2, ... */) {
	// Assert arguments type
	Asteroid.utils.must.beString(name);
	// Collect arguments into array
	var args = Array.prototype.slice.call(arguments);
	// Hash the arguments to get a key for _subscriptionsCache
	var fingerprint = JSON.stringify(args);
	// Only subscribe if there is no cached subscription
	if (!this._subscriptionsCache[fingerprint]) {
		// Get the parameters of the subscription
		var params = args.slice(1);
		// Subscribe
		var sub = new Subscription(
			name,
			params,
			fingerprint,
			this
		);
		this._subscriptionsCache[sub._fingerprint] = sub;
		this.subscriptions[sub.id] = sub;
	}
	return this._subscriptionsCache[fingerprint];
};

Asteroid.prototype._reEstablishSubscriptions = function () {
	var subs = this.subscriptions;
	var oldSub;
	var newSub;
	for (var id in subs) {
		if (subs.hasOwnProperty(id)) {
			oldSub = subs[id];
			newSub = new Subscription(
				oldSub._name,
				oldSub._params,
				oldSub._fingerprint,
				this
			);
			delete this.subscriptions[oldSub.id];
			delete this._subscriptionsCache[oldSub._fingerprint];
			this.subscriptions[newSub.id] = newSub;
			this._subscriptionsCache[newSub._fingerprint] = newSub;
		}
	}
};

Asteroid.prototype._openOauthPopup = function (credentialToken, loginUrl, afterCredentialSecretReceived) {
	var self = this;
	// Open the oauth popup
	var popup = window.open(loginUrl, "_blank", "location=no,toolbar=no");
	// If the focus property exists, it's a function and it needs to be
	// called in order to focus the popup
	if (popup.focus) {
		popup.focus();
	}
	var deferred = Q.defer();
	var request = JSON.stringify({
		credentialToken: credentialToken
	});
	var intervalId = setInterval(function () {
		popup.postMessage(request, self._host);
	}, 100);
	window.addEventListener("message", function (e) {
		var message;
		try {
			message = JSON.parse(e.data);
		} catch (err) {
			return;
		}
		if (e.origin === self._host) {
			if (message.credentialToken === credentialToken) {
				clearInterval(intervalId);
				deferred.resolve({
					credentialToken: message.credentialToken,
					credentialSecret: message.credentialSecret
				});
			}
			if (message.error) {
				clearInterval(intervalId);
				deferred.reject(message.error);
			}
		}
	});
	return deferred.promise
		.then(afterCredentialSecretReceived.bind(self));
};

Asteroid.utils.multiStorage.get = function (key) {
	var deferred = Q.defer();
	deferred.resolve(localStorage[key]);
	return deferred.promise;
};

Asteroid.utils.multiStorage.set = function (key, value) {
	var deferred = Q.defer();
	localStorage[key] = value;
	deferred.resolve();
	return deferred.promise;
};

Asteroid.utils.multiStorage.del = function (key) {
	var deferred = Q.defer();
	delete localStorage[key];
	deferred.resolve();
	return deferred.promise;
};

Asteroid.prototype._setDdpOptions = function (host, ssl, socketInterceptFunction) {
	// If SockJS is available, use it, otherwise, use WebSocket
	// Note: SockJS is required for IE9 support
	if (typeof SockJS === "function") {
		this._ddpOptions = {
			endpoint: (ssl ? "https://" : "http://") + host + "/sockjs",
			SocketConstructor: SockJS,
			socketInterceptFunction: socketInterceptFunction
		};
	} else {
		this._ddpOptions = {
			endpoint: (ssl ? "wss://" : "ws://") + host + "/websocket",
			SocketConstructor: WebSocket,
			socketInterceptFunction: socketInterceptFunction
		};
	}
};

return Asteroid;

}));

(function (root, factory) {
	if (typeof define === "function" && define.amd) {
		define(factory);
	} else if (typeof exports === "object") {
		module.exports = factory();
	} else {
		root.DDP = factory();
	}
}(this, function () {

	"use strict";

	var uniqueId = (function () {
		var i = 0;
		return function () {
			return (i++).toString();
		};
	})();

	var INIT_DDP_MESSAGE = "{\"server_id\":\"0\"}";
	// After hitting the plateau, it'll try to reconnect
	// every 16.5 seconds
	var RECONNECT_ATTEMPTS_BEFORE_PLATEAU = 10;
	var TIMER_INCREMENT = 300;
	var DEFAULT_PING_INTERVAL = 10000;
	var DDP_SERVER_MESSAGES = [
		"added", "changed", "connected", "error", "failed",
		"nosub", "ready", "removed", "result", "updated",
		"ping", "pong"
	];
	var DDP_VERSION = "1";

	var DDP = function (options) {
		// Configuration
		this._endpoint = options.endpoint;
		this._SocketConstructor = options.SocketConstructor;
		this._autoreconnect = !options.do_not_autoreconnect;
		this._ping_interval = options._ping_interval || DEFAULT_PING_INTERVAL;
		this._socketInterceptFunction = options.socketInterceptFunction;
		// Subscriptions callbacks
		this._onReadyCallbacks   = {};
		this._onStopCallbacks   = {};
		this._onErrorCallbacks   = {};
		// Methods callbacks
		this._onResultCallbacks  = {};
		this._onUpdatedCallbacks = {};
		this._events = {};
		this._queue = [];
		// Setup
		this.readyState = -1;
		this._reconnect_count = 0;
		this._reconnect_incremental_timer = 0;
		// Init
		if (!options.do_not_autoconnect) {
			this.connect();
		}
	};
	DDP.prototype.constructor = DDP;

	DDP.prototype.connect = function () {
		this.readyState = 0;
		this._socket = new this._SocketConstructor(this._endpoint);
		this._socket.onopen = this._on_socket_open.bind(this);
		this._socket.onmessage = this._on_socket_message.bind(this);
		this._socket.onerror = this._on_socket_error.bind(this);
		this._socket.onclose = this._on_socket_close.bind(this);
	};

	DDP.prototype.method = function (name, params, onResult, onUpdated) {
		var id = uniqueId();
		this._onResultCallbacks[id] = onResult;
		this._onUpdatedCallbacks[id] = onUpdated;
		this._send({
			msg: "method",
			id: id,
			method: name,
			params: params
		});
		return id;
	};

	DDP.prototype.sub = function (name, params, onReady, onStop, onError) {
		var id = uniqueId();
		this._onReadyCallbacks[id] = onReady;
		this._onStopCallbacks[id] = onStop;
		this._onErrorCallbacks[id] = onError;
		this._send({
			msg: "sub",
			id: id,
			name: name,
			params: params
		});
		return id;
	};

	DDP.prototype.unsub = function (id) {
		this._send({
			msg: "unsub",
			id: id
		});
		return id;
	};

	DDP.prototype.on = function (name, handler) {
		this._events[name] = this._events[name] || [];
		this._events[name].push(handler);
	};

	DDP.prototype.off = function (name, handler) {
		if (!this._events[name]) {
			return;
		}
		var index = this._events[name].indexOf(handler);
		if (index !== -1) {
			this._events[name].splice(index, 1);
		}
	};

	DDP.prototype._emit = function (name /* , arguments */) {
		if (!this._events[name]) {
			return;
		}
		var args = arguments;
		var self = this;
		this._events[name].forEach(function (handler) {
			handler.apply(self, Array.prototype.slice.call(args, 1));
		});
	};

	DDP.prototype._send = function (object) {
		if (this.readyState !== 1 && object.msg !== "connect") {
			this._queue.push(object);
			return;
		}
		var message;
		if (typeof EJSON === "undefined") {
			message = JSON.stringify(object);
		} else {
			message = EJSON.stringify(object);
		}
		if (this._socketInterceptFunction) {
			this._socketInterceptFunction({
				type: "socket_message_sent",
				message: message,
				timestamp: Date.now()
			});
		}
		this._socket.send(message);
	};

	DDP.prototype._try_reconnect = function () {
		if (this._reconnect_count < RECONNECT_ATTEMPTS_BEFORE_PLATEAU) {
			setTimeout(this.connect.bind(this), this._reconnect_incremental_timer);
			this._reconnect_count += 1;
			this._reconnect_incremental_timer += TIMER_INCREMENT * this._reconnect_count;
		} else {
			setTimeout(this.connect.bind(this), this._reconnect_incremental_timer);
		}
	};

	DDP.prototype._on_result = function (data) {
		if (this._onResultCallbacks[data.id]) {
			this._onResultCallbacks[data.id](data.error, data.result);
			delete this._onResultCallbacks[data.id];
			if (data.error) {
				delete this._onUpdatedCallbacks[data.id];
			}
		} else {
			if (data.error) {
				delete this._onUpdatedCallbacks[data.id];
				throw data.error;
			}
		}
	};
	DDP.prototype._on_updated = function (data) {
		var self = this;
		data.methods.forEach(function (id) {
			if (self._onUpdatedCallbacks[id]) {
				self._onUpdatedCallbacks[id]();
				delete self._onUpdatedCallbacks[id];
			}
		});
	};
	DDP.prototype._on_nosub = function (data) {
		if (data.error) {
			if (!this._onErrorCallbacks[data.id]) {
				delete this._onReadyCallbacks[data.id];
				delete this._onStopCallbacks[data.id];
				throw new Error(data.error);
			}
			this._onErrorCallbacks[data.id](data.error);
			delete this._onReadyCallbacks[data.id];
			delete this._onStopCallbacks[data.id];
			delete this._onErrorCallbacks[data.id];
			return;
		}
		if (this._onStopCallbacks[data.id]) {
			this._onStopCallbacks[data.id]();
		}
		delete this._onReadyCallbacks[data.id];
		delete this._onStopCallbacks[data.id];
		delete this._onErrorCallbacks[data.id];
	};
	DDP.prototype._on_ready = function (data) {
		var self = this;
		data.subs.forEach(function (id) {
			if (self._onReadyCallbacks[id]) {
				self._onReadyCallbacks[id]();
				delete self._onReadyCallbacks[id];
			}
		});
	};

	DDP.prototype._on_error = function (data) {
		this._emit("error", data);
	};
	DDP.prototype._on_connected = function (data) {
		var self = this;
		var firstCon = self._reconnect_count === 0;
		var eventName = firstCon ? "connected" : "reconnected";
		self.readyState = 1;
		self._reconnect_count = 0;
		self._reconnect_incremental_timer = 0;
		var length = self._queue.length;
		for (var i=0; i<length; i++) {
			self._send(self._queue.shift());
		}
		self._emit(eventName, data);
		// Set up keepalive ping-s
		self._ping_interval_handle = setInterval(function () {
			var id = uniqueId();
			self._send({
				msg: "ping",
				id: id
			});
		}, self._ping_interval);
	};
	DDP.prototype._on_failed = function (data) {
		this.readyState = 4;
		this._emit("failed", data);
	};
	DDP.prototype._on_added = function (data) {
		this._emit("added", data);
	};
	DDP.prototype._on_removed = function (data) {
		this._emit("removed", data);
	};
	DDP.prototype._on_changed = function (data) {
		this._emit("changed", data);
	};
	DDP.prototype._on_ping = function (data) {
		this._send({
			msg: "pong",
			id: data.id
		});
	};
	DDP.prototype._on_pong = function (data) {
		// For now, do nothing.
		// In the future we might want to log latency or so.
	};

	DDP.prototype._on_socket_close = function () {
		if (this._socketInterceptFunction) {
			this._socketInterceptFunction({
				type: "socket_close",
				timestamp: Date.now()
			});
		}
		clearInterval(this._ping_interval_handle);
		this.readyState = 4;
		this._emit("socket_close");
		if (this._autoreconnect) {
			this._try_reconnect();
		}
	};
	DDP.prototype._on_socket_error = function (e) {
		if (this._socketInterceptFunction) {
			this._socketInterceptFunction({
				type: "socket_error",
				error: JSON.stringify(e),
				timestamp: Date.now()
			});
		}
		clearInterval(this._ping_interval_handle);
		this.readyState = 4;
		this._emit("socket_error", e);
	};
	DDP.prototype._on_socket_open = function () {
		if (this._socketInterceptFunction) {
			this._socketInterceptFunction({
				type: "socket_open",
				timestamp: Date.now()
			});
		}
		this._send({
			msg: "connect",
			version: DDP_VERSION,
			support: [DDP_VERSION]
		});
	};
	DDP.prototype._on_socket_message = function (message) {
		if (this._socketInterceptFunction) {
			this._socketInterceptFunction({
				type: "socket_message_received",
				message: message.data,
				timestamp: Date.now()
			});
		}
		var data;
		if (message.data === INIT_DDP_MESSAGE) {
			return;
		}
		try {
			if (typeof EJSON === "undefined") {
				data = JSON.parse(message.data);
			} else {
				data = EJSON.parse(message.data);
			}
			if (DDP_SERVER_MESSAGES.indexOf(data.msg) === -1) {
				throw new Error();
			}
		} catch (e) {
			console.warn("Non DDP message received:");
			console.warn(message.data);
			return;
		}
		this["_on_" + data.msg](data);
	};

	return DDP;

}));

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
    initChart: function(element, chartId, useHighStocks) {
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
              if(chartInfo.options){
                _.extend(options,chartInfo.options);
              }
              if(useHighStocks === true){
                $element.highcharts('StockChart', options)
              } else {
                $element.highcharts(options)
              }
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

// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /* jshint strict: false */

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else {
        Q = definition();
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;

    function flush() {
        /* jshint loopfunc: true */

        while (head.next) {
            head = head.next;
            var task = head.task;
            head.task = void 0;
            var domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }

            try {
                task();

            } catch (e) {
                if (isNodeJS) {
                    // In node, uncaught exceptions are considered fatal errors.
                    // Re-throw them synchronously to interrupt flushing!

                    // Ensure continuation if the uncaught exception is suppressed
                    // listening "uncaughtException" events (as domains does).
                    // Continue in next event to avoid tick recursion.
                    if (domain) {
                        domain.exit();
                    }
                    setTimeout(flush, 0);
                    if (domain) {
                        domain.enter();
                    }

                    throw e;

                } else {
                    // In browsers, uncaught exceptions are not fatal.
                    // Re-throw them asynchronously to avoid slow-downs.
                    setTimeout(function() {
                       throw e;
                    }, 0);
                }
            }

            if (domain) {
                domain.exit();
            }
        }

        flushing = false;
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process !== "undefined" && process.nextTick) {
        // Node.js before 0.9. Note that some fake-Node environments, like the
        // Mocha test runner, introduce a `process` global without a `nextTick`.
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }

    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (isPromise(value)) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become fulfilled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be fulfilled
 */
Q.race = race;
function race(answerPs) {
    return promise(function(resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function(answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return isObject(object) &&
        typeof object.promiseDispatch === "function" &&
        typeof object.inspect === "function";
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return result.value;
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return exception.value;
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++countDown;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--countDown === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (countDown === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {String} custom error message (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, message) {
    return Q(object).timeout(ms, message);
};

Promise.prototype.timeout = function (ms, message) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        deferred.reject(new Error(message || "Timed out after " + ms + " ms"));
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});
