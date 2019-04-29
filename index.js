var instance_skel = require('../../instance_skel');
var tcp = require('../../tcp');
var debug;
var log;

function instance(system, id, config) {
		var self = this;

		// super-constructor
		instance_skel.apply(this, arguments);
		self.actions(); // export actions
		return self;
}

instance.prototype.init = function () {
		var self = this;

		debug = self.debug;
		log = self.log;

		self.status(self.STATUS_UNKNOWN);

		if (self.config.host !== undefined) {
				self.tcp = new tcp(self.config.host, 43680);

				self.tcp.on('status_change', function (status, message) {
						self.status(status, message);
				});

				self.tcp.on('error', function () {
						// Ignore
				});
		}
};

instance.prototype.updateConfig = function (config) {
		var self = this;
		self.config = config;

		if (self.tcp !== undefined) {
				self.tcp.destroy();
				delete self.tcp;
		}

		if (self.config.host !== undefined) {
				self.tcp = new tcp(self.config.host, 43680);

				self.tcp.on('status_change', function (status, message) {
						self.status(status, message);
				});

				self.tcp.on('error', function (message) {
						// ignore for now
				});
		}
};

// Return config fields for web config
instance.prototype.config_fields = function () {
		var self = this;
		return [
				{
						type: 'text',
						id: 'info',
						width: 12,
						label: 'Information',
						value: 'This module is for Barco HDX'
				},
				{
						type: 'textinput',
						id: 'host',
						label: 'Target IP',
						width: 6,
						default: '192.168.0.100',
						regex: self.REGEX_IP
				}
		];
};

// When module gets deleted
instance.prototype.destroy = function () {
		var self = this;

		if (self.tcp !== undefined) {
				self.tcp.destroy();
		}
		debug("destroy", self.id);
};

instance.prototype.actions = function (system) {
		var self = this;

		var actions = {
				'lamp': {
						label: 'Lamp control',
						options: [{
								type: 'dropdown',
								label: 'on/off',
								id: 'lamp',
								default: 'lamp_on',
								choices: [{ label: 'lamp on', id: 'lamp_on' }, { label: 'lamp off', id: 'lamp_off' }]
						}]
				},/*
				'loadLayout': {
						label: 'Load layout',
						options: [{
								type: 'textinput',
								id: 'parameter',
								label: 'parameter'
						}]
				},*/
				'shutter': {
						label: 'Shutter option 1',
						options: [{
								type: 'dropdown',
								label: 'on/off',
								id: 'shutter',
								default: 'shutter_close',
								choices: [{ label: 'shutter close', id: 'shutter_close' }, { label: 'shutter open', id: 'shutter_open' }]
						}]
				},
				'shutter2': {
						label: 'Shutter option 2',
						options: [{
								type: 'dropdown',
								label: 'on/off',
								id: 'shutter',
								default: 'shutter_close',
								choices: [{ label: 'shutter close', id: 'shutter_close' }, { label: 'shutter open', id: 'shutter_open' }]
						}]
				},
				'shutter3': {
						label: 'Shutter option 3',
						options: [{
								type: 'dropdown',
								label: 'on/off',
								id: 'shutter',
								default: 'shutter_close',
								choices: [{ label: 'shutter close', id: 'shutter_close' }, { label: 'shutter open', id: 'shutter_open' }]
						}]
				}
		};

		self.setActions(actions);
};

instance.prototype.action = function (action) {
		var self = this;
		var id = action.action;
		var opt = action.options;
		var cmd;

		getCommandValue = function(command, parameter) {
				let checksum = 5;
				let pBuffer  = Buffer.from(parameter);

				// Calculate the checksum value.
				command.forEach(function(item) {
						checksum += item;
				});

				pBuffer.forEach(function(item) {
						checksum += item;
				});

				checksum = checksum % 256;

				// Build the value to be sent.
				return Buffer.concat([
					Buffer.from([0xFE, 0x0, 0x0, 0x03, 0x02]),
					command,
					pBuffer,
					Buffer.from([0x0]),
					Buffer.from([checksum]),
					Buffer.from([0xFF])]);
		};

		switch (id) {
				case 'lamp':
					if (opt.lamp === 'lamp_on') {
						cmd = Buffer.from([0xfe,0x00,0x00,0x03,0x02,0x76,0x1a,0x01,0x96,0xff]);
					} else if (opt.lamp === 'lamp_off') {
						cmd = Buffer.from([0xfe,0x00,0x00,0x03,0x02,0x76,0x1a,0x00,0x96,0xff]);
					}
					break;

				case 'loadLayout':
					cmd = getCommandValue(Buffer.from([0x20, 0x90]), opt.parameter).toString('hex');
					break;

				case 'shutter':
					if (opt.shutter === 'shutter_open') {
							cmd = Buffer.from([0xfe,0x00,0x22,0x42,0x00,0x64,0xff]);
					} else if (opt.shutter === 'shutter_close') {
							cmd = Buffer.from([0xfe,0x00,0x23,0x42,0x00,0x65,0xff]);
					}
					break;

				case 'shutter2':
					if (opt.shutter === 'shutter_open') {
							cmd = Buffer.from([0xfe,0x00,0x22,0x42,0x00,0x64,0xff]).toString('hex');
					} else if (opt.shutter === 'shutter_close') {
							cmd = Buffer.from([0xfe,0x00,0x23,0x42,0x00,0x65,0xff]).toString('hex');
					}
					break;

				case 'shutter3':
					if (opt.shutter === 'shutter_open') {
							cmd = '\xfe\x00\x22\x42\x00\x64\xff';
					} else if (opt.shutter === 'shutter_close') {
							cmd = '\xfe\x00\x23\x42\x00\x65\xff';
					}
					break;
		}

		if (cmd !== undefined) {
				if (self.tcp !== undefined) {
						debug('sending ', cmd, "to", self.tcp.host);
						self.tcp.send(cmd);
				}
		}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
