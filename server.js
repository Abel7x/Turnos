var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ejs = require('ejs');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var printer = require('printer');
var baseUrl="http://10.10.123.205:3000/";
var template = "\t\t\t\t\t\t\t VENTANILLA UNICA\n\n\t\t\t\t\t\t\t\t\t\t\t\t\t\tTurno:\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\"barcode\"\n\n\t\t\t\t\t\t\t\t\t\t\t\tEs responsabilidad del ciudadano estar al pendiente de su turno\n\n\n\n\n\n\n\n";


//============== APP CONFIG ====================//
app.use(express.static(__dirname+'/public'));
app.set('view engine', 'ejs');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies

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




// =============== ROUTES ========================//
app.get('/', function(req, res){
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
	today = yyyy+'-'+mm+'-'+dd;



  	var query="SELECT * FROM TRTurnosVentana, turnos where turnos.id_turno=TRTurnosVentana.id_turno AND turnos.fecha='"+today+"'  ORDER BY turnos.id_turno DESC LIMIT 5";
	console.log(query);
	var objBD = BD();
	objBD.query(query, function(error, result, turno){
	    if(error){
	      console.log(error.message);
	    }else{
			
			var string='<table class="large-12 small-12 columns"><thead><tr><th><h2>Turno</h2></th><th><h2>Área</h2></th><th><h2>Ventanilla</h2></th></tr></thead><tbody id="turnos">';
			result.forEach(function(entry) {
				var area;
		        if(entry.id_caja=='1'){
		          area="Comercio";
		        }else if(entry.id_caja=='2'){
		          area="Catastro";
		        }else if(entry.id_caja=='3'){
		          area="Desarrollo Urbano";
		        }else if(entry.id_caja=='4'){
		          area="Traslado de Dominio";
		        }if(entry.id_caja=='5'){
		          area="Especial";
		        }
			    string+='<tr><td><h2>'+entry.folio+'</h2></td><td><h2>'+ area +'</h2></td><td><h2>'+entry.no_ventana+'</h2></td></tr>';
			});
			string+='<tr></tr></tbody></table>';
			objBD.end();
			res.render('index',{table:string,baseUrl:baseUrl});
	    }
	});
});

app.get('/dar', function(req, res){
	var objBD=BD();
	var query="SELECT id_tramite as id, descripción as text, requisitos from tramites";
    console.log(query);
    objBD.query(query, function(error, result){
	    if(error){
	      console.log(error.message);
	    }else{
	    	objBD.end();
    		res.render('selector',{baseUrl:baseUrl, tramites:JSON.stringify(result)});
			
	    }
	});


  	
});

app.get('/caja/:tipo/:caja', function(req,res){	
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
	today = yyyy+'-'+mm+'-'+dd;
	var tipo = req.params.tipo;
    var caja = req.params.caja;
    var objBD=BD();
    var query="SELECt COUNT(*) AS CONTEO FROM turnos where active=1 and turnos.fecha='"+today+"' and ID_Caja="+tipo;
    console.log(query);
    objBD.query(query, function(error, result){
	    if(error){
	      console.log(error.message);
	    }else{
	    	console.log("AH"+JSON.stringify(result[0]));
	    	objBD.end();
    		res.render('boton',{id_caja:tipo,num_caja:caja,conteo:result[0].CONTEO,baseUrl:baseUrl});		
			
	    }
	});
    
});


// ========== SOCKET LISTENERS ===========//
io.on('connection', function(socket){
  socket.on('chat message', function(entry){
    io.emit('chat message', entry);
  });
});




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
	console.log(turno);
	var objBD = BD();
	objBD.query('INSERT INTO TRTramiteTurno SET ?',{id_caja:req.body.direccion,id_tramite:req.body.tramite,fecha:today,no_ventana:req.body.noVentana,folio_tramite:req.body.folioTramite}, function(error, result){
	    if(error){
	      console.log(error.message);
	    }else{
	    	query='SELECT descripción FROM tramites WHERE id_tramite='+req.body.tramite;
	    	objBD.query(query, function(error, result, turno){
		    if(error){
		      console.log(error.message);
		    }else{
		    	var jsonRes=JSON.stringify({folio:req.body.folioTramite, id:req.body.tramite,url:url,row:'<tr><td>'+result[0].descripción+'</td><td>'+req.body.folioTramite+'</td></tr>'});
		    	objBD.end();
		    	res.writeHead(200, { 'Content-Type': 'text/javascript' }); 
				res.end(jsonRes);

		    }});
    		
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
				objBD.end();
				res.end(string);
		    }
		});
  });

// =========== CAMBIAR TURNO ============= //
app.post("/siguiente", function(req,res){
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
	today = yyyy+'-'+mm+'-'+dd;
	var objBD = BD();
	var id=req.body.area;
	var numero=req.body.ventana;
	

	var query="SELECT * FROM turnos WHERE active=1 AND turnos.fecha='"+today+"' and id_caja="+ id +" ORDER BY ID_TURNO ASC LIMIT 1";
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

				objBD.query('INSERT INTO TRTurnosVentana SET ?',{id_turno: result[0].id_turno,no_ventana:numero}, function(error, result){
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
				var query="SELECt COUNT(*) AS CONTEO FROM turnos where active=1 AND turnos.fecha='"+today+"' and ID_Caja="+id;
				console.log(query);

				objBD.query(query, function(error, result){
				    if(error){
				      console.log(error.message);
				    }else{
				    	objBD.end();
						res.render('boton',{id_caja:id, num_caja:numero, conteo:result[0].CONTEO, turno:turno,baseUrl:baseUrl})		
						
				    }
				});
				
	    		
	    	}else{
	    		objBD.end();
	    		res.render('boton',{id_caja:id, num_caja:numero, conteo:0, mensaje:"Ya no hay turnos",baseUrl:baseUrl})
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
	console.log(query);
	switch(req.body.id_caja) {
	    case '1':
	        var url='Comercio';
	        break;
	    case '2':
	        var url='Catastro';
	        break;
	    case '3':
	        var url='Desarrollo Urbano';
	        break;
	    case '4':
	        var url='Traslado de Dominio';
	        break; 
	    case '5':
	    	var url='Especial';
	    default:
	        break	
	  }
	  console.log("url:"+url);
	objBD.query(query, function(error, result, turno){
	    if(error){
	      console.log(error.message);
	    }else{
	    	if(result.length>0){
	    		//SELECT COUNT(*) AS CONTEO FROM turnos WHERE id_caja=2 AND active=1

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

				var query="SELECT id_tramite as id, descripción as text, requisitos from tramites";
			    console.log(query);
			    objBD.query(query, function(error, result){
				    if(error){
				      console.log(error.message);
				    }else{
				    	printZerbra(turno, "EPSON");
						console.log("Se intento imprimir");
						objBD.end();
			    		res.render('selector',{folio:turno, area:url,baseUrl:baseUrl, tramites:JSON.stringify(result)});
						
				    }
				});


	    	}else{
	    		objBD.query('INSERT INTO turnos SET ?',{folio: 1,fecha:today,id_caja:req.body.id_caja, active:1}, function(error, result){
				});


				var query="SELECT id_tramite as id, descripción as text, requisitos from tramites";
			    console.log(query);
			    objBD.query(query, function(error, result){
				    if(error){
				      console.log(error.message);
				    }else{
				    	printZerbra(turno, "mostrador1");
						console.log("Se intento imprimir");
						objBD.end();
			    		res.render('selector',{folio:"0001", area:url,baseUrl:baseUrl, tramites:JSON.stringify(result)});
						
				    }
				});

				
	    	}
	      

	    }
	  });
	  
});

//=============  REPORTEO ================
app.get('/reporte', function(req, res){
	var objBD=BD();
	var query="select count(id_caja) as total, id_caja from turnos where fecha > '2014-09-02' group by id_caja";
    console.log(query);
    objBD.query(query, function(error, result){
	    if(error){
	      console.log(error.message);
	    }else{
	    	objBD.end();
    		res.render('reporte',{baseUrl:baseUrl, comercio:result[0].total, catastro:result[1].total,du:result[2].total,td:result[3].total,especial:result[4].total});
			
	    }
	});


  	
});

function printZerbra(barcode_text, printer_name){
	printer.printDirect({data:template.replace(/barcode/, barcode_text)
		, printer:printer_name
		, type: "RAW"
		, success:function(){
			console.log("printed: "+barcode_text);
		}
		, error:function(err){console.log(err);}
	});
}

http.listen(3000, function(){
  console.log('listening on *:3000');
});
