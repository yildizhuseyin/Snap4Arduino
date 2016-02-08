/*
    Changes to WorldMorph for managing Snap4Arduino functions
*/

/**
 * Global object (world.Arduino) used for s4a/arduino properties
 */
WorldMorph.prototype.Arduino = {
    firmata : require('firmata'),
    portList : [],
    usedPorts : []
};

/**
 * Locks the given port to prevent its use in other connection (until it is unlocked)
 */
WorldMorph.prototype.Arduino.lockPort = function (port) {
    var usedPorts = this.usedPorts;

    if (usedPorts.indexOf(port) === -1) {
        usedPorts.push(port);
    }
}

/**
 * Unlocks a previously Locked port to permit its use in new connections
 * Should be called when closing connections
 */
WorldMorph.prototype.Arduino.unlockPort = function (port) {
    var usedPorts = this.usedPorts;

    if (usedPorts.indexOf(port) > -1) {
        usedPorts.splice(usedPorts.indexOf(port));
    }
}

/**
 * Informs whether the port is locked or unlocked
 */
WorldMorph.prototype.Arduino.isPortLocked = function (port) {
    return (this.usedPorts.indexOf(port) > -1)
}


/**
 * Gets a list of available serial ports (paths) and return it through callback function
 */
WorldMorph.prototype.Arduino.getSerialPorts = function (callback) {
    var myself = this;

    var portList = [];
    var portcheck = /usb|DevB|rfcomm|acm|^com/i; // Not sure about rfcomm! We must dig further how bluetooth works in Gnu/Linux

    chrome.serial.getDevices(function (devices) { 
        if (devices) { 
            devices.forEach(function(device) { 
                if(!myself.isPortLocked(device.path) && portcheck.test(device.path)) {
                    portList[device.path] = device.path; 
                }
            });
        }
        callback(portList);
    });
    
};

WorldMorph.prototype.Arduino.processC = function (body) {
    var lines = body.split('\n'),
        header = '/* ============================================\n'
               + ' *        AUTO-Generated by Snap4Arduino\n'
               + ' * ============================================\n'
               + ' *\n'
               + ' * Please review this sketch before pushing it.\n'
               + ' *\n'
               + ' * This is an experimental feature, and there\n'
               + ' * are _several_ Snap!-related functionalities\n'
               + ' * that are, by definition, untranslatable to\n'
               + ' * static languages.\n'
               + ' *\n'
               + ' * There is NO WARRANTY whatsoever that this\n'
               + ' * sketch is going to work exactly in the same\n'
               + ' * way as the original Snap4Arduino script.\n'
               + ' */\n\n',
        setup = 'void setup() {\n',
        servoLines,
        servoPins,
        digitalOutputLines,
        digitalOutputPins,
        digitalInputLines,
        digitalInputPins;
    
    unique = function(anArray) {
        return anArray.filter(function(elem, pos) { 
            return anArray.indexOf(elem) == pos; 
        })
    }

    // let's find out what pins are we using, and for what purpose
    servoLines = lines.filter(function(each) { return each.match(/servo[0-9]*\.write/)} );
    servoPins = unique(servoLines.map(function(each) { return each.replace(/.*servo([0-9]*)\.write.*/g, '$1') }));

    digitalOutputLines = lines.filter(function(each) { return each.match(/digitalWrite/)});
    digitalOutputPins = unique(digitalOutputLines.map(function(each) { return each.replace(/.*digitalWrite\(([0-9]*),.*\).*/g, '$1') }));

    digitalInputLines = lines.filter(function(each) { return each.match(/digitalRead/)});
    digitalInputPins = unique(digitalInputLines.map(function(each) { return each.replace(/.*digitalRead\(([0-9]*)\).*/g, '$1') }));

    // now let's construct the header and the setup body
    if (servoLines.length > 0) { header += '#include <Servo.h>\n\n' };

    servoPins.forEach( function(pin) { 
        header += 'Servo servo' + pin + ';\n'
        setup += '  servo' + pin + '.attach(' + pin + ');\n'
    });

    header += '\n';

    digitalOutputPins.forEach( function(pin){ setup += '  pinMode(' + pin + ', OUTPUT);\n' });
    digitalInputPins.forEach( function(pin){ setup += '  pinMode(' + pin + ', INPUT);\n' });

    setup += '}\n\n';

    return (header + setup + body);
}