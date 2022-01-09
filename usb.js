
var SerialPort = require("serialport");

var tty = "COM3"

var chunk = ""

var callback = null

		var port = new SerialPort(tty, {
            baudRate: 9600
          });
      
      port.on('open', function() {
            console.log('opened : '+tty);
            
      });

      port.on('error', function(err) {
            console.log('error ', err.message);
      });

      port.on('close', function () {
          console.log("closed ");
      });

      port.on('data', function(data) {
          //console.log("data = "+data)
          chunk += data;
          //console.log(typeof(port.data)) 
          for (;;) {
              var pos = chunk.indexOf("\n");
              if (pos < 0) break;
              //console.log(usb.chunk.substring(0,pos));
              if (callback != null) callback(chunk.substring(0,pos))
              chunk = chunk.substring(pos+1);
          }
      })
    
      function setCallback(f) {
          callback = f
      }

      function write(s) {
          port.write(s)
      }

module.exports = {
    setCallback : setCallback,
    write : write
}