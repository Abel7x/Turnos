var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ejs = require('ejs');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var printer = require('printer');



//============== APP CONFIG ====================//
app.use(express.static(__dirname+'/public'));
app.set('view engine', 'ejs');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies


// =============== ROUTES ========================//
app.get('/', function(req, res){
  res.render('index');
});

app.get('/dar', function(req, res){
  res.render('selector');
});

app.get('/caja/:tipo/:caja', function(req,res){	
	var tipo = req.params.tipo;
    var caja = req.params.caja;
    res.render('boton',{id_caja:tipo,num_caja:caja});
});


// ========== SOCKET LISTENERS ===========//
io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});


// ====== MYSQL STUFF ========== //
function BD(){
  	var connection = mysql.createConnection(
   		{user: 'root',
   		 password: 'root',
   		 host: 'localhost',
   		 port: '8889',
   		 database: 'turnos',
   		 dateStrings: 'true'
	});
  	return connection; 
}

// ============ REGISTRAR TRAMITE =========== //
app.post('/registrarTramite', function(req, res) {
    var direccion = req.body.direccion,
        ventana = req.body.ventana;
    var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; //January is 0!
	var yyyy = ""+today.getFullYear();
	var date;
	
	if(dd<10) {
	    dd='0'+dd
	} 

	if(mm<10) {
	    mm='0'+mm
	}
	var turno = req.body.turno;
	today = yyyy.substr(yyyy.length-2)+'/'+mm+'/'+dd;
	date = dd+mm+yyyy.substr(yyyy.length-2);
	switch(direccion) {
	    case '1':
	        var url='CO'+turno+''+date;
	        break;
	    case '2':
	        var url='CA'+turno+''+date;
	        break;
	    case '3':
	        var url='DU'+turno+''+date;
	        break;
	    case '4':
	        var url='TD'+turno+''+date;
	        break; 
	    default:
	        break;
	}

	var objBD = BD();
	objBD.query('INSERT INTO TRTramiteTurno SET ?',{id_caja:req.body.direccion,id_tramite:req.body.folioTramite,fecha:today,no_ventana:req.body.noVentana}, function(error, result){
	    if(error){
	      console.log(error.message);
	    }else{
    		res.writeHead(200, { 'Content-Type': 'text/html' }); 
			res.end(url);
	    }
	});



	
	

	


    // ...
});

// =========== OBTENER TRAMITES ============ // 
app.get('/getTramites/:caja', function(req, res){
		var objBD = BD();
		var caja = req.params.caja;
		var query="SELECT * FROM tramites WHERE id_caja="+caja;
		console.log(query);
		objBD.query(query, function(error, result, turno){
		    if(error){
		      console.log(error.message);
		    }else{
				
      			res.writeHead(200, { 'Content-Type': 'text/html' }); 
      			
      			var string='';
      			result.forEach(function(entry) {
				    string+='<option value="'+entry.id_tramite+'">'+entry.descripción+'</option>';
				});
				res.end(string);
		    }
		});
  });

// =========== CAMBIAR TURNO ============= //
app.post("/siguiente", function(req,res){
	var objBD = BD();
	var id=req.body.area;
	var numero=req.body.ventana;
	

	var query="SELECT * FROM turnos WHERE active=1 AND id_caja="+ id +" ORDER BY ID_TURNO ASC LIMIT 1";
	objBD.query(query, function(error, result, turno){
	    if(error){
	      console.log(error.message);
	    }else{
	    	if(result.length>0){
	    		io.emit('siguiente',{folio: result[0].folio, caja:numero,area:id} );
	    		var query="UPDATE turnos SET active = 0 WHERE id_turno = "+result[0].id_turno;
				objBD.query(query, function(error, result, turno){
					if(error){
				      console.log(error.message);
				    }else{

				    }
				});
				var turno = result[0].folio;
				if(turno<10){
					turno = '000'+turno;
				}else if(turno <100){
					turno = '00'+turno;
				}else if(turno<1000){
					turno = '0'+turno;
				}
	    		res.render('boton',{id_caja:id, num_caja:numero, turno:turno})
	    	}else{
	    		res.render('boton',{id_caja:id, num_caja:numero, mensaje:"Ya no hay turnos"})
	    	}
	    }
	});

});



// =========== CREAR TURNO =============== // 
app.post("/crear", function (req, res) {
    var objBD = BD();
    var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; //January is 0!
	var yyyy = ""+today.getFullYear();
	
	if(dd<10) {
	    dd='0'+dd
	} 

	if(mm<10) {
	    mm='0'+mm
	}
	today = yyyy.substr(yyyy.length-2)+'/'+mm+'/'+dd;
	
	var query = 'SELECT * FROM turnos WHERE fecha="'+ today + '" ORDER BY ID_turno DESC LIMIT 1';
	
	objBD.query(query, function(error, result, turno){
	    if(error){
	      console.log(error.message);
	    }else{
	    	if(result.length>0){
	    		//SELECT COUNT(*) FROM turnos WHERE id_caja=2 AND active=1

	    		objBD.query('INSERT INTO turnos SET ?',{folio: result[0].folio+1,fecha:today,id_caja:req.body.id_caja, active:1}, function(error, result){

				});
				var turno = result[0].folio+1;
				if(turno<10){
					turno = '000'+turno;
				}else if(turno <100){
					turno = '00'+turno;
				}else if(turno<1000){
					turno = '0'+turno;
				}
				res.render('selector',{folio:turno});
				printer.printDirect({data:"print from Node.JS"
					, printer:"EPSON TM-T88IV Receipts"
					, type: "TEXT"
					, success:function(){
						console.log("ok");
					}
					, error:function(err){console.log(err);}
				});

	    	}else{
	    		objBD.query('INSERT INTO turnos SET ?',{folio: 1,fecha:today,id_caja:req.body.id_caja, active:1}, function(error, result){
				});
				printer.printDirect({data:"print from Node.JS"
					, printer:"Foxit PDF Printer"
					, type: "TEXT"
					, success:function(){
						console.log("ok");
					}
					, error:function(err){console.log(err);}
				});
				res.render('selector',{folio:'0001'})
				
	    	}
	      

	    }
	  });
	  
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
