var map;
var container;
var zoom = 9;
var centerPoint = new GLatLng(45.7,4.9);
var centerMarker;
var pointInterval = 10;
var maxRadius = 1;
var requestDelay = 30;
var maxSpeed = 90;

var computations = [
    {time: 45, color: '#ff0000'},
    {time: 30, color: '#ffff00'},
    {time: 15, color: '#00ff00'}
]

window.onload = load;
window.onunload = unload;

var baseIcon2 = new GIcon();
baseIcon2.iconSize=new GSize(8,8);
baseIcon2.iconAnchor=new GPoint(4,4);
baseIcon2.infoWindowAnchor=new GPoint(4,0);
var redIcon8 = (new GIcon(baseIcon2, "/images/redSquare_8.png", null, ""));

function load() {
	if (GBrowserIsCompatible()) {
		container = document.getElementById("map");
		map = new GMap2(container, {draggableCursor:"crosshair"});
		map.addMapType(G_PHYSICAL_MAP)

		map.setCenter(centerPoint, zoom, G_PHYSICAL_MAP);

		map.addControl(new GScaleControl());
		map.addControl(new GLargeMapControl());
		map.addControl(new GMapTypeControl());

		map.enableContinuousZoom();
		map.enableScrollWheelZoom();		

		GEvent.addListener(map, "click", mapClick);
	}
}

function RequestQueue() {
    this._requests = [];
    this._status = 'IDLE';

    this.pushRequest = function(r) {
        this._requests.push(r);

        if('IDLE' == this._status) {
            this.start();
        }
    };

    this.start = function() {

        if(('RUNNING' == this._status) || (0 == this._requests.length)) {
            GLog.write('Error: queue is empty or already running');
            return false;
        }

        this._status = 'RUNNING';
        var request = this._requests.shift();
        request();
        return true;

    };

    this.finish = function() {

        if(0 == this._requests.length) {
            this._status = 'IDLE';
            return;
        }

        this._status = 'WAITING';
        setTimeout('rq.start()', requestDelay);

    };
}

var rq = new RequestQueue();

function mapClick(ov,pt) {
    map.clearOverlays();

	if (!centerMarker) {
		centerMarker = new GMarker(pt);
	}
	else {
		map.removeOverlay(centerMarker);
		centerMarker.setPoint(pt);
	}
	map.addOverlay(centerMarker);

    if(0 == computations.length) {
        return;
    }

	for (var i in computations) {
	    runComputation(pt, computations[i]);
	}
}

function runComputation(pt, computation) {
    var dirObj = new GDirections();
    var upperDistBound = ((computation.time / 60) * maxSpeed).toFixed(2);

    maxRadius = Math.max(upperDistBound, maxRadius);

	dirObj.currentComputation = computation;
    dirObj.currentComputation.circleMarkers = Array();
    dirObj.currentComputation.drivePolyPoints = Array();
    dirObj.currentComputation.searchPoints = Array();
    dirObj.currentComputation.drivePolygon = null;

    GEvent.addListener(dirObj, "load", onDirectionsLoad);
    GEvent.addListener(dirObj, "error", onDirectionsError);

	dirObj.currentComputation.searchPoints = getCirclePoints(pt, upperDistBound);

	dirObj.currentComputation.drivePolyPoints = Array();
	getDirections(dirObj);
}

function getCirclePoints(center,radius){
	var circlePoints = Array();
	var searchPoints = Array();

	with (Math) {
		var rLat = (radius/6378.135) * (180/PI); // kilometers
		var rLng = rLat/cos(center.lat() * (PI/180));

		for (var a = 0 ; a < 361 ; a++ ) {
			var aRad = a*(PI/180);
			var x = center.lng() + (rLng * cos(aRad));
			var y = center.lat() + (rLat * sin(aRad));
			var point = new GLatLng(parseFloat(y),parseFloat(x),true);
			circlePoints.push(point);
			if (a % pointInterval == 0) {
				searchPoints.push(point);
			}
		}
	}

	var searchPolygon = new GPolygon(circlePoints, '#0000ff', 1, 1, '#0000ff', 0.1);	
	map.addOverlay(searchPolygon);
	if(radius >= maxRadius) {
	    map.setCenter(searchPolygon.getBounds().getCenter(),map.getBoundsZoomLevel(searchPolygon.getBounds()));
    }
	return searchPoints;

}

function getDirections(dirObj) {
	if (!dirObj.currentComputation.searchPoints.length) {
		return;
	}
	var from = centerMarker.getLatLng().lat() + ' ' + centerMarker.getLatLng().lng();
	var to = dirObj.currentComputation.searchPoints[0].lat() + ' ' + dirObj.currentComputation.searchPoints[0].lng();
	dirObj.currentComputation.searchPoints.shift();

	var loadStr = 'from: ' + from + ' to: ' + to;

	rq.pushRequest(function() {
	    dirObj.load(loadStr,{getPolyline:true,getSteps:true});
	});
}

function onDirectionsLoad() {
	var status = this.getStatus();
	var bounds = this.getBounds();
	var distance = parseInt(this.getDistance().meters);
	var duration = parseFloat(this.getDuration().seconds).toFixed(2);
	var polyline = this.getPolyline();

    if(undefined == this.currentComputation.medianSpeed) {
	    this.currentComputation.medianSpeed = distance / duration;
	}

	shortenAndShow(this.currentComputation, polyline);
	getDirections(this);

	rq.finish();
}

function shortenAndShow(computation, polyline) {
	var distToDriveM = (computation.time * 60) * computation.medianSpeed;
	var dist = 0;
	var cutoffIndex = 0;
	var copyPoints = Array();

	for (var n = 0 ; n < polyline.getVertexCount()-1 ; n++ ) {
		dist += polyline.getVertex(n).distanceFrom(polyline.getVertex(n+1));
        //GLog.write(dist + ' - ' + distToDriveM);
		if (dist < distToDriveM) {
			copyPoints.push(polyline.getVertex(n));
		}
		else {
			break;
		}
	}

	var lastPoint = copyPoints[copyPoints.length-1];
	var newLine = new GPolyline(copyPoints, '#ff0000', 2, 1);
	map.addOverlay(newLine);

	computation.drivePolyPoints.push(lastPoint);
	//addBorderMarker(computation, lastPoint, dist)
	if (computation.drivePolygon) {
		map.removeOverlay(computation.drivePolygon);
	}
	computation.drivePolygon = new GPolygon(computation.drivePolyPoints,
	    computation.color, 1, 1, computation.color, 0.4);	
	map.addOverlay(computation.drivePolygon);
}

function addBorderMarker(computation, pt, d) {
	var str = pt.lat().toFixed(6) + ',' + pt.lng().toFixed(6) + ' - Distance: ' + (d/1000).toFixed(2) + ' Km';
	var marker = new GMarker(pt,{icon:redIcon8,title:str});
	computation.circleMarkers.push(marker);
	map.addOverlay(marker);
}

function onDirectionsError() {
    if(620 == this.getStatus().code) {
        GLog.write('Error: Too many requests, the result set may be inacurrate');
    } else {
	    GLog.write('Error: ' + this.getStatus().code);    
    }
	getDirections(this);
}

function unload() {
	GUnload();
}

