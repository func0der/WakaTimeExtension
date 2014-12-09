$(function() {
  var Days = Backbone.Collection.extend({
    url: '/api/v1/summary',
  });
  var Language = Backbone.Model.extend({
    url: '/api/v1/users/current/languages',
  });
  var View = Backbone.View.extend({
    el: $('#project'),
    data: {
      days: new Days(),
    },
    events: {
      'click #date-picker': 'chooseDate',
    },
    render: function() {
      var files = {};
      var files_by_day = {};
      var languages_used = {};
      var logged_time_data = [];
      var total_logged_seconds = 0;
      var time_by_file = {};
      var range_start = this.data.days.first().get('range').start_date;
      var range_end = this.data.days.last().get('range').end_date;
      var previous_days_average, last_day;
      this.data.days.each(function(day, index) {
        var total = day.get('grand_total').total_seconds;
        var date = moment.unix(day.get('range').start).tz(this.options.timezone);
        files_by_day[date.format('ddd MMM Do YYYY')] = {};
        _.each(day.get('languages'), function(language) {
          if (languages_used[language.name] === undefined) {
            languages_used[language.name] = {
              name: language.name,
              total: 0,
            };
          }
          languages_used[language.name].total += language.percent / 100.0 * day.get('grand_total').total_seconds;
        }, this);
        if (index == this.data.days.length - 1) {
          previous_days_average = total_logged_seconds / (this.data.days.length - 1);
          last_day = day.get('grand_total').total_seconds;
        }
        total_logged_seconds += day.get('grand_total').total_seconds;
        _.each(day.get('files'), function(file) {
          if (files[file.name] === undefined) {
            files[file.name] = {
              name: file.name,
              total: 0,
            };
          }
          files[file.name].total += file.total_seconds;
          files_by_day[date.format('ddd MMM Do YYYY')][file.name] = file;
        }, this);
        logged_time_data.push({
          name: date.format('ddd MMM Do YYYY'),
          xAxis: date.format('MMM Do'),
          value: parseFloat((total / 3600.0).toFixed(2)),
          total_seconds: total,
          formatted: day.get('grand_total').text,
        });
      }, this);
      _.each(files, function(project, name) {
        time_by_file[name] = [];
      });
      this.data.days.each(function(day) {
        var date = moment.unix(day.get('range').start).tz(this.options.timezone);
        _.each(files, function(project, name) {
          if (files_by_day[date.format('ddd MMM Do YYYY')] !== undefined && files_by_day[date.format('ddd MMM Do YYYY')][name] !== undefined) {
            var total = files_by_day[date.format('ddd MMM Do YYYY')][name].total_seconds;
            var text = files_by_day[date.format('ddd MMM Do YYYY')][name].text;
          } else {
            var total = 0;
            var text = '0 minutes';
          }
          time_by_file[name].push({
            name: date.format('ddd MMM Do YYYY'),
            y: total / 3600.0,
            total_seconds: total,
            formatted: text,
            project: name,
          });
        }, this);
      }, this);
      var total_seconds = 0;
      _.each(files, function(project, index) {
        total_seconds += project.total;
      });
      // START OF CUSTOM CODE by func0der.
      var html = 'You logged <span class="logged-time-text">{{logged_time}}</span> {{#range.article}}{{range.article}} {{/range.article}}<a id="date-picker" href="#">{{range.text}}</a> in {{project}} {{#branches}}in branch(es) <a id="branch-picker" style="text-decoration: underline;">{{branches}}{{/branches}}{{^branches}}<a id="branch-picker" style="text-decoration: underline;">all{{/branches}}</a>.';

      this.$el.find('#logged-time').html(Mustache.render(html, {
        project: this.options.project,
        logged_time: utils.format_seconds(total_seconds),
        range: utils.naturalDateRange(range_start, range_end),
        branches: this.options.branches.join(',')
      }));
      // END OF CUSTOM CODE by func0der.
      this.$el.find('#date-picker').daterangepicker({
        startDate: moment.tz(this.options.start, this.options.timezone),
        endDate: moment.tz(this.options.end, this.options.timezone),
        ranges: {
          'Today': [moment().tz(this.options.timezone), moment().tz(this.options.timezone)],
          'Yesterday': [moment().tz(this.options.timezone).subtract(1, 'days'), moment().tz(this.options.timezone).subtract(1, 'days')],
          'Last 7 Days': [moment().tz(this.options.timezone).subtract(6, 'days'), moment().tz(this.options.timezone)],
          'Last 30 Days': [moment().tz(this.options.timezone).subtract(29, 'days'), moment().tz(this.options.timezone)],
          'This Month': [moment().tz(this.options.timezone).startOf('month'), moment().tz(this.options.timezone).endOf('month')],
          'Last Month': [moment().tz(this.options.timezone).subtract(1, 'month').startOf('month'), moment().tz(this.options.timezone).subtract(1, 'month').endOf('month')],
        },
      });
      this.$el.find('#date-picker').on('apply.daterangepicker', $.proxy(function(ev, picker) {
        this.options.start = picker.startDate.format('YYYY-MM-DD');
        this.options.end = picker.endDate.format('YYYY-MM-DD');
        this.setRangeInUrl();
      }, this));
      var max = Math.ceil(_.max(logged_time_data, function(item) {
        return item.value;
      }).value);
      max += max % 2;
      this.$el.find('#logged-time-total').removeClass('hidden');
      this.total_logged_time_chart = c3.generate({
        bindto: '#logged-time-total .graph',
        data: {
          columns: [
            ['Logged Time'].concat(_.map(logged_time_data, function(item) {
              return item.value;
            })),
          ],
          type: 'spline',
        },
        axis: {
          x: {
            padding: {
              left: 0,
              right: 0
            },
            tick: {
              format: function(x) {
                return logged_time_data[x].xAxis;
              },
            },
          },
          y: {
            min: 0,
            ticks: 4,
            padding: {
              bottom: 0
            },
            label: {
              text: 'Hours',
              position: 'outer-middle',
            },
          },
        },
        tooltip: {
          contents: $.proxy(function(x) {
            x = x[0];
            var html = '<div class="c3-tooltip"><div class="c3-tooltip-header">{{header}}</div><div class="value">{{time}}</div></div>';
            return Mustache.render(html, {
              header: logged_time_data[x.index].name,
              time: logged_time_data[x.index].formatted,
            });
          }, this),
        },
        grid: {
          y: {
            lines: _.map(d3.scale.linear().domain([0, max]).ticks(4), function(tick) {
              return {
                value: tick,
                class: 'c3-ygrid'
              };
            }),
          },
        },
        legend: {
          show: false,
        },
        size: {
          height: 170
        },
        padding: {
          right: 20,
          left: 36
        },
      });
      var columns = _.map(languages_used, function(data, key) {
        return [key, total_logged_seconds > 0 ? (data.total / total_logged_seconds * 100).toFixed(2) : 0];
      });
      var sortedColumns = _.sortBy(columns, function(column) {
        return column[1];
      }).reverse();
      this.$el.find('#languages-used').removeClass('hidden');
      this.languages_used_chart = c3.generate({
        bindto: '#languages-used .graph',
        data: {
          columns: sortedColumns,
          type: 'pie',
          onclick: $.proxy(function(d, i) {
            this.showLanguage(d.name);
          }, this),
        },
        legend: {
          show: false,
          position: 'right',
        },
        size: {
          height: 170
        },
        padding: {
          right: 0,
          left: 0,
          top: 0,
          bottom: 0
        },
      });
      var sortedFiles = _.sortBy(_.values(files), function(file) {
        return file.total;
      }).reverse();
      var prefix = utils.commonPath(_.pluck(sortedFiles, 'name'));
      _.each(sortedFiles, function(file, index) {
        var $html = Mustache.render($('#file-template').html(), {
          index: index,
          file_name: ((file.name.indexOf(prefix) == 0) ? file.name.replace(prefix, '') : file.name),
          logged_time: utils.format_seconds(file.total, true),
          prefix: prefix,
        });
        this.$el.find('#files').append($html);
      }, this);
      return this;
    },
    showLanguage: function(language_name) {
      $('.modal').remove();
      var html = $('#modal-template').html();
      this.$el.append(Mustache.render(html, {
        title: language_name
      }));
      this.$el.find('.modal-body').html('<div class="center-xs"><img src="/static/img/ajax-loader.gif" border="0" /></div>');
      this.$el.find('.modal').modal('show').on('hidden.bs.modal', $.proxy(function(e) {
        $(document).unbind('keyup');
      }, this));
      $(document).keyup($.proxy(function(e) {
        if (e.keyCode == 27) this.$el.find('.modal').modal('hide');
      }, this));
      var language = new Language();
      language.on('sync', function() {
        if (this.$el.find('.modal-body').length) {
          this.$el.find('.modal-body').html(Mustache.render('{{#files}}<p>{{name}}</p>{{/files}}{{#other}}<p style="margin-top:30px;"><a href="/settings#settings/preferences">Create custom rules to organize these files</a></p>{{/other}}', {
            files: language.get('files'),
            other: language.get('name') === 'Other',
          }));
        }
      }, this);
      language.fetch({
        data: {
          start: this.options.start,
          end: this.options.end,
          project: this.options.project,
          language: language_name,
        },
      });
      return this;
    },
    chooseDate: function(e) {
      e && e.preventDefault();
    },
    error: function(object, response) {
      this.$el.empty();
      utils.set_form_errors(this.$el, response.responseText);
      return this;
    },
    setRangeInUrl: function(start, end) {
      var params = {};
      _.each(window.location.search.replace('?', '').split('&'), function(param) {
        param = param.split('=', 2);
        if (param.length == 2) {
          params[param[0]] = param[1];
        }
      }, this);
      params['start'] = encodeURIComponent(this.options.start);
      params['end'] = encodeURIComponent(this.options.end);
      window.location.search = _.map(params, function(val, key) {
        return [key, val].join('=');
      }).join('&');
    },
    fetchDays: function() {
      this.$el.find('#logged-time').html('<div class="center-xs"><img src="/static/img/ajax-loader.gif" border="0" /></div>');
      this.$el.find('#files').empty();
      this.data.days.fetch({
        data: {
          start: this.options.start,
          end: this.options.end,
          project: this.options.project,
        },
      });
    },
    initialize: function(options) {
      this.options = _.defaults(options || {}, {});
      var today = moment().tz(this.options.timezone);
      this.options.end = this.options.end || today.format('YYYY-MM-DD');
      this.options.start = this.options.start || today.subtract(6, 'days').format('YYYY-MM-DD');
      this.listenTo(this.data.days, 'sync', this.render);
      this.listenTo(this.data.days, 'error', this.error);

      // START OF CUSTOM CODE by func0der.
      this.extendedInitialize();
      // END OF CUSTOM CODE by func0der.

      return this;
    },
    // START OF CUSTOM CODE by func0der.
    extendedInitialize: function () {
      // Check for initialization, because we only want to apply this
      // callback once.
      if(typeof(this.initialized) === 'undefined' || this.initialized === false) {
        jQuery(window).on(
          'popstate',
          jQuery.proxy(
            function(event) {
              // Get push state.
              var pushState = event.originalEvent.state;

              // Set options to old state.
              this.options = pushState;

              // Refresh view everytime someone is navigating with
              // the use of HTML5 history.
              this.refreshView();
            },
            this
          )
        );
      }

      // Extract branches from url.
      var branchesRegEx = window.location.search.match(/(?:&|\?)branches=([^\&]+)/),
        branches = (branchesRegEx !== null ? decodeURIComponent(branchesRegEx[1]).split(',') : []);

      // Add branches to options.
      this.options.branches = branches;

      // Initialize branches holder.
      this.data.branches = [];

      // Add another 'sync' listener to the day sync, to render correctly with
      // branches.
      this.listenTo(this.data.days, 'sync', this.extendRender);

      // Initialization complete.
      this.initialized = true;

      // Refresh view. In this case it is the first call, at all.
      this.refreshView();

      return this;
    },
    /**
     * Refreshes the view by using `this.options` values.
     *
     * @return View
     *   Returns instance of View.
     */
    refreshView: function() {
      this.showLoader(this.$el.find('#logged-time'));
      this.$el.find('#files').empty();

      var self = this;
      var promise = this.fetchBranches();

      promise
        .fail(function(jqXHR) {
          // Clear container in the beginning. It is easier to show all error
          // messages this way.
          self.$el.empty();
          utils.set_form_errors(self.$el, jqXHR.responseText);
          return this;
        })
        .done(
          function(){
            self.fetchDays();
          }
        );

      return this;
    },
    /**
     * Overwrites default View.fetchDays() with a custom implementation.
     *
     * This implementation is aware of the `branches` parameter.
     */
    fetchDays: function() {
      var parameters = {
        start: this.options.start,
        end: this.options.end,
        project: this.options.project
      };

      // Add branches only if there are any in the url, because else we
      // would get no results back.
      if (this.options.branches.length > 0) {
        parameters.branches = this.options.branches.join(',');
      }

      this.data.days.fetch({
        data: parameters,
      });
    },
    /**
     * Prepares the fetching of branches from daily detail view JSON.
     *
     * There is currently no way to get the branches via the API via the
     * project detail API. So we need to use the daily detail view of a
     * project to get all branches from a given date range. This can cause
     * major trouble and loading times with premium accounts and ranges
     * longer than seven days (which it was tested with), because we need
     * to make a call for EACH AND EVERY day. This is why it only gets and
     * shows branches from the last 7 days by design.
     *
     * @return Object
     *   A jQuery promise.
     */
    fetchBranches: function() {
      // Initialize.
      // Current date is the end date of the current range.
      var curDate = moment(this.options.end, 'YYYY-MM-DD'),
        // Counter to make sure we only get the branches of the last
        // seven days.
        maxCounter = 0,
        // Array holding the date to get branches for.
        datesArray = [];

      // Push the current date.
      datesArray.push(curDate.format('YYYY-MM-DD'));

      // Collect dates to get branches for.
      while(curDate.format('YYYY-MM-DD') !== this.options.start && maxCounter !== 6) {
        // Substract one day.
        curDate = curDate.subtract(1, 'days');

        // Push to date collection.
        datesArray.push(curDate.format('YYYY-MM-DD'));

        // Raise counter.
        maxCounter++;
      }

      // Reference to View object.
      var self = this;
      // Create empty resolved promise.
      var DeferredOrg = jQuery.Deferred().resolve();
      // Chain all AJAX request to each other.
      var result = datesArray.reduce(
        function (Deferred, date) {
          return Deferred.then(function () {return self.collectBranches(date);});
        },
        DeferredOrg
      );

      return result;
    },
    /**
     * Creates the AJAX request for getting the branches for a given date.
     *
     * @param string date
     *   The date to get branches for. Format is YYYY-MM-DD.
     *
     * @return Object
     *   A jQuery AJAX object.
     */
    collectBranches: function(date) {
      var branchesUrl = '/api/v1/durations';
      var self = this;
      var result = jQuery.ajax({
        type: "GET",
        url: branchesUrl,
        data: {
          date: date,
          project: this.options.project
        },
        dataType: "JSON",
        success: function(data){
          if (typeof(data.data) !== 'undefined') {
            jQuery.each(data.data, function() {
              // Some rare cases where "branch" is not filled or
              // does not exist at all are covered by this.
              if (typeof(this.branch) !== 'undefined' && this.branch !== null && this.branch.toString() !== '') {
                // Make sure to get every branch just once.
                if(self.data.branches.indexOf(this.branch) === -1) {
                  self.data.branches.push(this.branch);
                }
              }
            });
          }
        }
      });

      return result;
    },
    /**
     * Extends the rendered view.
     *
     * @return View
     *   An instance of View.
     */
    extendRender: function() {
      this.$el.find('#branch-picker').on(
        'mouseup',
        jQuery.proxy(
          function(e) {
            var $newEl = (jQuery('#branch-picker-container').length > 0) ? jQuery('#branch-picker-container') : jQuery('<div id="branch-picker-container"></div>');
            var html = '<ul>{{#branches}}<li><input type="checkbox" value="{{.}}" id="branch_{{.}}" {{#checked}}{{.}}{{/checked}}><label for="branch_{{.}}">{{.}}</label></li>{{/branches}}</ul><div class="ok_button">Ok</div> <div class="cancel_button">Cancel</div>'
            $newEl.html(Mustache.render(html, {
              branches: this.data.branches,
              checked: jQuery.proxy(
                function() {
                  return jQuery.proxy(
                    function(text, render) {
                      var renderedText = render(text);

                      if (this.options.branches.indexOf(renderedText) !== -1) {
                        return 'checked="checked"';
                      }
                    },
                    this
                  );
                },
                this
              )
            }));
            var $self = $(e.target);
            var self = this;

            var newElStyling = {
              backgroundColor: '#ffffff',
              boxShadow: '3px 3px 10px #000000',
              borderRadius: '15px',
              left: $self.offset().left,
              padding: '10px 20px',
              position: 'absolute',
              top: $self.offset().top + $self.height()
            };

            $newEl.css(newElStyling);

            jQuery('body').append($newEl);

            $newEl.find('.ok_button').on(
              'mouseup',
              jQuery.proxy(
                function(e) {
                  var tickedBranches = [];
                  $newEl.find('input:checked').each(function() {
                    tickedBranches.push(jQuery(this).val());
                  });

                  if (tickedBranches.length != this.options.branches.length) {
                    this.options.branches = tickedBranches;

                    this.setBranchesInUrl(tickedBranches);
                  }

                  $newEl.remove();
                },
                this
              )
            );

            $newEl.find('.cancel_button').on(
              'mouseup',
              jQuery.proxy(
                function(e) {
                  $newEl.remove();
                },
                this
              )
            );
          },
          this
        )
      );
    },
    /**
     * Sets date range in url and adds new history state.
     *
     * This function is an overwrite of the original this.setRangeInUrl().
     *
     * @param array start
     *   Date in YYYY-MM-DD format.
     * @param array end
     *   Date in YYYY-MM-DD format.
     *
     * @return View
     *   A View instance.
     */
    setRangeInUrl: function(start, end) {
      var params = {};
      _.each(window.location.search.replace('?', '').split('&'), function(param) {
        param = param.split('=', 2);
        if (param.length == 2) {
          params[param[0]] = param[1];
        }
      }, this);
      params['start'] = encodeURIComponent(this.options.start);
      params['end'] = encodeURIComponent(this.options.end);

      var search = _.map(params, function(val, key) {
        return [key,
          val].join('=');
      }).join('&');

      // Change url without reloading the page.
      history.pushState(this.options, '', window.location.pathname + '?' + search);

      this.refreshView();

      return this;
    },
    /**
     * Sets branches in url and adds new history state.
     *
     * @param array branches
     *   Branches to add to url.
     *
     * @return View
     *   A View instance.
     */
    setBranchesInUrl: function(branches) {
      var params = {};
      _.each(window.location.search.replace('?', '').split('&'), function(param) {
        param = param.split('=', 2);
        if (param.length == 2) {
          params[param[0]] = param[1];
        }
      }, this);
      params['branches'] = encodeURIComponent(branches.join(','));
      var search = _.map(params, function(val, key) {
        return [key,
          val].join('=');
      }).join('&');

      // Change url without reloading the page.
      history.pushState(this.options, '', window.location.pathname + '?' + search);

      this.refreshView();

      return this;
    },
    /**
     * Shows loader in the given target.
     *
     * @param jQuery $target
     *   The target to put the loader in.
     *
     * @return View
     *   A View instance.
     */
    showLoader: function($target) {
      $target.html('<div class="center-xs"><img src="/static/img/ajax-loader.gif" border="0" /></div>');
    },
    // END OF CUSTOM CODE by func0der.
  });
  var project = new View({
    timezone: window.data.timezone,
    project: window.data.project,
    start: window.data.start,
    end: window.data.end,
  });
});
