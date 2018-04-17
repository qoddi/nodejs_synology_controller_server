var Service, Characteristic;
var Synology = require('./synology');
var inherits = require('util').inherits;
var pollingtoevent = require('polling-to-event');
var fs=require('fs');








function SynologyAccessory(log, config) {
    this.log = log;
    this.config = config;
    this.name = config.name;
    this.log('Diskstation url:http%s://%s:%s',config.secure?'s':'',config.ip,config.port);

    synology = new Synology({
      ip: config.ip,
      mac: config.mac,
      secure: config.secure || null,
      port: config.port || null,
      version: config.version,
      user: config.user || config.account,
      passwd: config.password,
      timeout: config.timeout || 3000
    });
	this.synology =synology;
    var that = this;

    this.doPolling = config.doPolling || false;
	this.pollingInterval = config.pollingInterval || 60;
	this.pollingInterval = parseInt(this.pollingInterval);

	this.setAttempt = 0;
	this.state = false;

	if (this.interval < 10 && this.interval > 100000) {
		this.log('polling interval out of range... disabled polling');
		this.doPolling = false;
	}

	// Status Polling
	if (this.doPolling) {
		that.log('start polling...');
		var statusemitter = pollingtoevent(function(done) {
			that.log('do poll...')
			that.getPowerState(function(error, state) {
				done(error, state, that.setAttempt);
			}, 'statuspoll');
		},{
		    longpolling: true,
		    interval: that.pollingInterval * 1000,
		    longpollEventName:'statuspoll'
		});

		statusemitter.once('statuspoll', function(data) {
			that.state = data;
			that.log('poll end, state: ' + data);


		});




	}

};



SynologyAccessory.CpuLoad = function () {
    Characteristic.call(this, 'CPU Load', '12d21a89-9466-4548-8edd-b05e6b93c23e');
    this.setProps({
        format: Characteristic.Formats.UINT8,
        unit: Characteristic.Units.PERCENTAGE,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};


SynologyAccessory.DiskUsage = function () {
    Characteristic.call(this, 'Disk Usage', 'de3c3d3d-6f86-446c-9dac-535858736ddd');
    this.setProps({
        format: Characteristic.Formats.UINT8,
        unit: Characteristic.Units.PERCENTAGE,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};




SynologyAccessory.prototype.getPowerState = function (callback, context) {
    var that = this;

    if ((!context || context != 'statuspoll') && this.doPolling) {
		callback(null, this.state);
	} else {
        that.synology.getPowerState(function (err, state) {
            if (!err) {
                that.log('current power state is: ' + state);
                callback(null, state);
            } else {
                that.log(err);
                callback(err);
            }
        });
    }
};


SynologyAccessory.prototype.setPowerState = function (powerState, callback, context) {
    var that = this;

    //don't set the value while polling
	if (context && context === 'statuspoll') {
		callback(null, powerState);
	    return;
	}

    this.setAttempt++;

    if (!powerState) { //turn on
        that.synology.wakeUp(function (err) {
            if (!err) {
                that.log('Diskstation woked up!');
                callback(null);
            } else {
                that.log('Something went wrong: ' + err);
                callback(err);
            }
        });
    }

    else { //turn off
        that.synology.shutdown(function (err) {
            if (!err) {
                that.log('Shutting down Diskstation')
                callback(null);
            } else {
                that.log('Error shutting down Diskstation: ' + err)
                callback(err);
            }
        });
    }
};


SynologyAccessory.prototype.getCpuLoad = function (callback) {
    var that = this;



    that.synology.getCpuLoad(function (err, data) {
        if (!err) {
            that.log('current cpu load: %s %', data);
            callback(null, data);
        } else {
            that.log(err);
            callback(null, 0); //testing
        }
    });
};


SynologyAccessory.prototype.getDiskUsage = function (callback) {
    var that = this;


    that.synology.getDiskUsage(function (err, data) {
        if (!err) {
            that.log('current volume usage: %s %', data);
            callback(null, data);
        } else {
            that.log(err);
            callback(null, 0); //testing
        }
    });
};


SynologyAccessory.prototype.getSystemTemp = function (callback) {
    var that = this;



    that.synology.getSystemTemp(function (err, data) {
        if (!err) {
            that.log('current system temp: %s °C', data);
            callback(null, data);
        } else {
            that.log(err);
            callback(null, 0); //testing
        }
    });
};

SynologyAccessory.prototype.getDiskTemp = function (callback) {
    var that = this;

    if(!that.state) {
        callback(null, 0)
        return;
    }

    that.synology.getDiskTemp(function (err, data) {
        if (!err) {
            that.log('current disk temp: %s °C', data);
            callback(null, data);
        } else {
            that.log(err);
            callback(null, 0); //testing
        }
    });
};

SynologyAccessory.prototype.nasinfo = function(callback) {
	var that = this;
	that.getPowerState(function(err,data){that.state=data;}, 'statuspoll');
	that.getCpuLoad(function(err,data){that.cpu=data;});
	that.getSystemTemp(function(err,data){that.temp=data;});
	if(that.signal!=true){
		var autofresh=setInterval(function(err,data){
		if(that.state==true){
			that.getCpuLoad(function(err,data){that.cpu=data;});
			that.getSystemTemp(function(err,data){that.temp=data;});
			if(typeof(that.disk)=="undefined"){that.getDiskUsage(function(err,data){that.disk=data;});console.log("disk debug");};
			if(typeof(that.disk)=="undefined"||typeof(that.cpu)=="undefined"||typeof(that.temp)=="undefined"){that.signal=false;}
			else that.signal=true;
			console.log("website refresh success,powerstate:"+that.state+",cpuload:"+that.cpu+",temp:"+that.temp+",diskusage:"+that.disk);
			if (that.signal==true)
				clearInterval(autofresh);
		}},1000);};

	setTimeout(function(){console.log("website refresh success,powerstate:"+that.state+",cpuload:"+that.cpu+",temp:"+that.temp+",diskusage:"+that.disk);},1000);
};

module.exports = SynologyAccessory;