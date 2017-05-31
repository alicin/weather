// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('weather', ['ionic'])

.run(function($ionicPlatform, $rootScope, $interval) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }

    $interval(function () {
      $rootScope.moment = moment().format('ddd, h:mm');
    }, 1000);

  });
})
.constant('APIKEY', '697bfd07e7af4dd87f26fe4b0597ac82')
.factory('Weather', function ($http, $q, APIKEY) {
  return {
    getByCity: function (city) {
      var deferred = $q.defer();

      var url = 'http://api.openweathermap.org/data/2.5/weather?q=' + city + '&units=metric&APPID=' + APIKEY;
      $http.get(url)
      .success(function (data, status, headers, config) {
        deferred.resolve(data);
      }).error(function (data, status, headers, config) {
        deferred.reject(data);
      });

      return deferred.promise;
    },

    getByGeo: function (coords) {
      var deferred = $q.defer();

      var url = 'http://api.openweathermap.org/data/2.5/weather?lat=' + coords.lat + '&lon=' + coords.lon + '&units=metric&APPID=' + APIKEY;
      $http.get(url)
      .success(function (data, status, headers, config) {
        deferred.resolve(data);
      }).error(function (data, status, headers, config) {
        deferred.reject(data);
      });

      return deferred.promise;
    },

    
  }
})
.factory('City', function () {

  if ( !localStorage.cities ) localStorage.cities = JSON.stringify([]);

  var db = JSON.parse(localStorage.cities);

  function save() {
    db.forEach(function (item) {
      delete item.loaded;
      delete item.$$hashkey;
    })
    localStorage.cities = JSON.stringify(db);
    db = JSON.parse(localStorage.cities);
  };

  return {
    list: function () {
      return db;
    },
    add: function (data) {
      db.push(data);
      save();
      return db;
    },
    destroy: function (index) {
      db.splice(index, 1);
      save();
      return db;
    }
  };

})
.controller('AppController', function ($rootScope, $scope, $http, Weather, $ionicModal, City) {

  $scope.locations = City.list() || [];


  navigator.geolocation.getCurrentPosition(function (location) {
    $scope.current = {title: 'current', coords: {
      lat: location.coords.latitude,
      lon: location.coords.longitude
    }};
    request();
  }, function (error) {
    request();
  }, { maximumAge: 1000 * 60 * 60 * 24 * 1000, timeout: 20000, enableHighAccuracy: true });

  $scope.getForecast = function (index) {
    request(index);
  };

  var getItems = function (temp, state, sys) {

    if ( temp < 0 ) {
      var weather = 'colder';
      var color = '#0092FF';
    } else if ( temp > 0 && temp < 10 ) {
      var weather = 'cold';
      var color = '#00a3aa';
    } else if ( temp > 10 && temp < 20 ) {
      var weather = 'warm';
      var color = '#5AC400';
    } else if ( temp > 20 && temp < 30 ) {
      var weather = 'hot';
      var color = '#E89100';
    } else if ( temp > 30 ) {
      var weather = 'hotter';
      var color = '#E86543';
    };

    var now = Date.now();

    if ( now > sys.sunset && now < sys.sunrise ) {
      var time = 'night';
    } else {
      var time = 'day';
    };

    var items = {
      colder: ['a winter coat', 'a beanie', 'a scarf', 'an earmuff'],
      cold: ['a coat', 'a beanie', 'a scarf', 'boots'],
      warm: ['a sweater', 'a scarf', 'mid sneakers', 'a jacket'],
      hot: ['sneakers', 'jeans', 'a hoodie', 'a t-shirt'],
      hotter: ['flip flops', 'shorts', 'a t-shirt'],
      rain: ['an umbrella'],
      snow: ['snowboots']
    };

    var value = _.sample(items[weather], 3);
    if ( items[state] ) value.push(_.sample(items[state], 1)[0]);
    return {
      items: value,
      color: color
    };
  };

  var request = function (index) {
    $scope.results = true;
    var index = index || 0;

    if ( index === 0 ) {

      Weather.getByGeo($scope.current.coords)
      .then(function (data) {
        $scope.current = _.extend($scope.current, data);
        $scope.current.settings = getItems(data.main.temp, data.weather[0].main, data.sys);
        $scope.current.loaded = true;
      })
      .catch(function (error) {
        console.log(error);
      });

      return;
    };

    Weather.getByCity($scope.locations[index - 1].title)
    .then(function (data) {
      _.extend($scope.locations[index - 1], data);
      $scope.locations[index - 1].settings = getItems(data.main.temp, data.weather[0].main, data.sys);
      $scope.locations[index - 1].loaded = true;
    })
    .catch(function (error) {
      console.log(error);
    })
  };

  $scope.showSettings = function () {
    $scope.settings = true;
    $ionicModal.fromTemplateUrl('templates/settings.html', {
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.settings = modal;
      $scope.settings.show();
    });
  };

  $rootScope.$on('settings::destroy', function () {
    $scope.settings.remove();
    delete $scope.settings;
    $scope.locations = City.list() || [];
  })

})

.controller('SettingsCtrl', function ($rootScope, $scope, Weather, City) {

  $scope.closeSettings = function () {
    $rootScope.$emit('settings::destroy');
  };

  $scope.cities = City.list();

  $scope.addCity = function (city) {
    $rootScope.$emit('loading:show');
    Weather.getByCity(city)
    .then(function (data) {
      var currentID = localStorage.id || 1;
      var id = parseInt(currentID);
      id++;
      localStorage.id = id;
      var item = {
        id: id,
        title: data.name + ', ' + data.sys.country,
        name: data.name,
        coords: {
          lat: data.coord.lat,
          lon: data.coord.lon
        }
      };
      $scope.cities = City.add(item);
      $scope.city = '';
      $rootScope.$emit('loading:hide');
    })
    .catch(function (error) {
      console.log(error);
      $scope.loading = false;
      $rootScope.$emit('loading:hide');
    })
  };

  $scope.deleteCity = function (index) {
    $scope.cities = City.destroy(index);
  };

})
.filter('round', function() {
  return function(text) {
    return Math.round(text);
  };
})