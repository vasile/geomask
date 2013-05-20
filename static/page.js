$(document).ready(function() {
    google.maps.visualRefresh = true;
    
    var map_intial_center = new google.maps.LatLng(46.7, 9.1);
    var map_inital_zoom = 5;
    var map_initial_type_id = google.maps.MapTypeId.ROADMAP;
    
    if (typeof(localStorage) !== 'undefined') {
        if (typeof(localStorage.map_center_x) !== 'undefined') {
            map_intial_center = new google.maps.LatLng(parseFloat(localStorage.map_center_y), parseFloat(localStorage.map_center_x));
            map_inital_zoom = parseInt(localStorage.map_zoom, 10);
            map_initial_type_id = localStorage.map_type_id;
        } 
    }
    
    var map = new google.maps.Map($('#map_canvas')[0], {
        center: map_intial_center,
        zoom: map_inital_zoom,
        mapTypeId: map_initial_type_id
    });
    
    google.maps.event.addListener(map, 'idle', function() {
        $('#coordinates').html(map.getCenter().toUrlValue());
        $('#zoom').html(map.getZoom());
        
        localStorage['map_center_x'] = map.getCenter().lng();
        localStorage['map_center_y'] = map.getCenter().lat();
        localStorage['map_zoom'] = map.getZoom();
    });
    
    google.maps.event.addListener(map, 'maptypeid_changed', function() {
        localStorage['map_type_id'] = map.getMapTypeId();
    });
    
    var overlay = new google.maps.OverlayView();
    overlay.draw = function(){};
    
    var map_inited = google.maps.event.addListener(map, 'idle', function() {
        google.maps.event.removeListener(map_inited);
    });
    
    var geocoder = new google.maps.Geocoder();
    
    if (navigator.geolocation) {
        $('#geolocation_trigger').click(function(){
            navigator.geolocation.getCurrentPosition(function(position){
                var point = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                geocoder.geocode({'latLng': point}, function(results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        var place = results[0];
                        $('#area_of_interest').val(place.formatted_address);
                        map.fitBounds(place.geometry.viewport);
                    }
                });
            }, function(error){});
        });            
    }
    
    var projection_changed = google.maps.event.addListener(map, 'projection_changed', function() {
        overlay.setMap(map);
        google.maps.event.removeListener(projection_changed);
        
        $('#polygon_main_add').removeAttr('disabled');
    });
    
    var autocomplete = new google.maps.places.Autocomplete($('#area_of_interest')[0], {
        types: ['geocode']
    });
    autocomplete.bindTo('bounds', map);
    google.maps.event.addListener(autocomplete, 'place_changed', function(){
        var place = autocomplete.getPlace();
        if ((typeof place.geometry) === 'undefined') {
            geocoder.geocode({'address': place.name}, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    var place = results[0];
                    $('#area_of_interest').val(place.formatted_address);
                    map.fitBounds(place.geometry.viewport);
                }
            });
        } else {
            map.fitBounds(place.geometry.viewport);
        }
    });
    
    var polygon = new google.maps.Polygon({
        map: null,
        editable: true,
        
        strokeColor: '#000000',
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: '#CACACA',
        fillOpacity: 0.7,
        
        paths: []
    });
    google.maps.event.addListener(polygon, 'rightclick', function(ev){
        var path = polygon.getPaths().getAt(ev.path);
        if (path.getLength() > 3) {
            path.removeAt(ev.vertex);
        }
    });
    
    google.maps.event.addListener(polygon, 'click', function(){
        if (polygon.getEditable() === false) {
            polygon.setEditable(true);
        }
    });
    
    google.maps.event.addListener(map, 'click', function(){
        if (polygon.getEditable()) {
            polygon.setEditable(false);
        }
    });
    
    function getPathFromExpandedBounds(bounds) {
        var center = bounds.getCenter();
        var bounds_span = bounds.toSpan();
        var expand_factor = 1.5;

        var map_extra_bl_x = center.lng() - bounds_span.lng() * expand_factor;
        var map_extra_bl_y = center.lat() - bounds_span.lat() * expand_factor;
        var map_extra_bl = new google.maps.LatLng(map_extra_bl_y, map_extra_bl_x);

        var map_extra_tr_x = center.lng() + bounds_span.lng() * expand_factor;
        var map_extra_tr_y = center.lat() + bounds_span.lat() * expand_factor;
        var map_extra_tr = new google.maps.LatLng(map_extra_tr_y, map_extra_tr_x);

        var path = [
            map_extra_bl,
            new google.maps.LatLng(map_extra_tr_y, map_extra_bl_x),
            map_extra_tr,
            new google.maps.LatLng(map_extra_bl_y, map_extra_tr_x)
        ];
        
        return path;
    }
    
    $('#polygon_main_add').on('click', function(){
        function get_random_value(val_max) {
            val_max = val_max || 100;
            return Math.floor((Math.random()*val_max));
        }
        
        var point_center = map.getCenter();
        
        var paths = polygon.getPaths();
        var paths_length = paths.getLength();
        if (paths_length === 0) {
            var bounds = map.getBounds();
            var path_universe = new google.maps.MVCArray(getPathFromExpandedBounds(bounds));

            paths.push(path_universe);
            google.maps.event.addListener(path_universe, 'set_at', coordinates_textbox_update);
            
            paths_length += 1;
            
            $('#table_paths').removeClass('hide');
        }
        
        var projection = overlay.getProjection();
        var px_center = projection.fromLatLngToContainerPixel(point_center);
        
        var polygon_width = 300;
        var polygon_height = 200;
        
        var px_bl_x = parseInt(px_center.x - (polygon_width / 2)) + get_random_value();
        var px_bl_y = parseInt(px_center.y + (polygon_height / 2)) + get_random_value();
        
        var px_br_x = parseInt(px_center.x + (polygon_width / 2)) + get_random_value();
        var px_br_y = parseInt(px_center.y + (polygon_height / 2)) + get_random_value();
        
        var px_tr_x = parseInt(px_center.x + (polygon_width / 2)) + get_random_value();
        var px_tr_y = parseInt(px_center.y - (polygon_height / 2)) + get_random_value();
        
        var px_tl_x = parseInt(px_center.x - (polygon_width / 2)) + get_random_value();
        var px_tl_y = parseInt(px_center.y - (polygon_height / 2)) + get_random_value();
        
        var point_bl = projection.fromContainerPixelToLatLng(new google.maps.Point(px_bl_x, px_bl_y));
        var point_br = projection.fromContainerPixelToLatLng(new google.maps.Point(px_br_x, px_br_y));
        var point_tr = projection.fromContainerPixelToLatLng(new google.maps.Point(px_tr_x, px_tr_y));
        var point_tl = projection.fromContainerPixelToLatLng(new google.maps.Point(px_tl_x, px_tl_y));
        
        var path = new google.maps.MVCArray([
            point_bl,
            point_br,
            point_tr,
            point_tl
        ]);
        google.maps.event.addListener(path, 'set_at', coordinates_textbox_update);
        
        paths.push(path);
        
        polygon.setPaths(paths);
        if (polygon.getMap() === null) {
            polygon.setMap(map);
        }
        
        pathAppend2Table(paths_length);
        
        coordinates_textbox_update();
    });
    
    $(document).on('click', '#table_paths tbody tr button', function() {
        var row_index = $(this).closest('tr')[0].rowIndex;
        
        var action = $(this).attr('data-action');
        if (action === 'delete') {
            var yn = confirm("Current drawing will be erased\nDo you want to continue ?");
            if (yn) {
                $(this).closest('tr').remove();
                
                var paths = polygon.getPaths();
                paths.removeAt(row_index);
                
                coordinates_textbox_update();
            }
        }
        
        if (action === 'zoom') {
            var path = polygon.getPaths().getAt(row_index);
            var bounds = pathGetBounds(path);
            map.fitBounds(bounds);
        }
    });
    

    var ibs = [];
    function coordinates_textbox_update(){
        var geojson = {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {
                    "name": "Mask"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": []
                }
            }]
        };
        
        var kml = {
            outer: null,
            inner: []
        };
        
        var gmaps_polygon_paths = [];

        $.each(ibs, function(k, ib){
            ib.close();
        });
        ibs = [];
        
        polygon.getPaths().forEach(function(path, k){
            var geojson_coordinates = [];
            var kml_coordinates = [];
            var gmaps_polygon_path = [];
            
            var p_x0 = p_y0 = null;
            
            path.forEach(function(point, k){
                var p_x = point.lng().toFixed(6);
                var p_y = point.lat().toFixed(6);
                
                if (k === 0) {
                    p_x0 = p_x;
                    p_y0 = p_y;
                }

                geojson_coordinates.push([parseFloat(p_x), parseFloat(p_y)]);
                kml_coordinates.push(p_x + ',' + p_y);
                gmaps_polygon_path.push('new google.maps.LatLng(' + p_y + ', ' + p_x + ')');
                
                var step = path.getLength() <= 5 ? 1 : 10;
                if ((k % step) === 0) {
                    var ib = new InfoBox({
                        closeBoxURL: '',
                        content: '<span class="badge badge-success">' + k + '</span>',
                        disableAutoPan: true,
                        position: point
                    });
                    ib.open(map);
                    ibs.push(ib);
                }
            });
            
            geojson_coordinates.push([parseFloat(p_x0), parseFloat(p_y0)]);
            kml_coordinates.push(p_x0 + ',' + p_y0);
            gmaps_polygon_path.push('new google.maps.LatLng(' + p_y0 + ', ' + p_x0 + ')');

            geojson.features[0].geometry.coordinates.push(geojson_coordinates);

            var kml_ring = kml_coordinates.join(' ');
            if (k === 0) {
                kml.outer = kml_ring;
            } else {
                kml.inner.push(kml_ring);
            }
            
            gmaps_polygon_paths.push('[' + gmaps_polygon_path.join(",\n") + ']');
        });
        
        var kml_inner_rings = [];
        $.each(kml.inner, function(k, inner){
            kml_inner_rings.push("<innerBoundaryIs><LinearRing><coordinates>" + inner + "</coordinates></LinearRing></innerBoundaryIs>");
        });
        
        $('#coordinates_geojson').val(JSON.stringify(geojson, null, 4));
        $('#coordinates_kml').val("<Polygon>\n<outerBoundaryIs><LinearRing><coordinates>" + kml.outer + "</coordinates></LinearRing></outerBoundaryIs>\n" + kml_inner_rings.join("\n") + "\n</Polygon>");
        $('#coordinates_kml').val("<Polygon>\n<outerBoundaryIs><LinearRing><coordinates>" + kml.outer + "</coordinates></LinearRing></outerBoundaryIs>\n" + kml_inner_rings.join("\n") + "\n</Polygon>");
        
        $('#coordinates_gmaps_polygon').val("var polygonMask = new google.maps.Polygon({\nmap:map,\nstrokeColor: '#000000',\nstrokeOpacity: 0.5,\nstrokeWeight: 2,\nfillColor: '#CACACA',\nfillOpacity: 0.7,\npaths: [" + gmaps_polygon_paths.join(",\n") + "]});");
    }
    
    $('#polygon_reset').click(function(){
        var yn = confirm('Are you sure ?');
        if (yn) {
            $('#table_paths tbody').html('');
            
            polygon.setPaths(new google.maps.MVCArray([]));
            coordinates_textbox_update();
        }
    });
    
    $('#geojson_load').click(function(){
        // var yn = confirm("Current polygon will be replaced with the content from the textarea.\n\nDo you want to continue ?");            
        var yn = true;

        if (yn) {
            var geojson_alert = $('#geojson_alert');
            $('#geojson_alert').addClass('hide');

            try {
                var geojson_input = $('#coordinates_geojson').val();

                var geojson = $.parseJSON(geojson_input);
                var geometry = geojson['features'][0].geometry;
                
                var coordinates = [];
                if (geometry.type === 'Polygon') {
                    coordinates = geometry.coordinates;
                }
                if (geometry.type === 'MultiPolygon') {
                    $.each(geometry.coordinates, function(k, polygon_coordinates) {
                        coordinates = coordinates.concat(polygon_coordinates);
                    });
                }

                var paths = [];
                $.each(coordinates, function(k, path_coordinates){
                    var path = [];
                    $.each(path_coordinates, function(k, point){
                        var point = new google.maps.LatLng(parseFloat(point[1]), parseFloat(point[0]));
                        path.push(point);
                    });
                    paths.push(path);
                });
                var bounds = pathsGetBounds(paths);
                
                var path0 = paths[0];
                var needMask;
                if ((paths.length > 1) && (path0.length <= 5) && pathIsCW(path0)) {
                    needMask = false;
                    var path0_bounds = pathGetBounds(path0);
                    for (var i=1; i<paths.length; i++) {
                        var path_bounds = pathGetBounds(paths[i]);
                        if (path0_bounds.containBounds(path_bounds) === false) {
                            needMask = true;
                            break;
                        }
                    }
                } else {
                    needMask = true;
                }
                
                if (needMask) {
                    var path = getPathFromExpandedBounds(bounds);
                    paths.unshift(path);
                }
                
                $('#table_paths tbody').html('');
                $.each(paths, function(k, path){
                    if (k > 0) {
                        console.log('Path ' + k + '(' + path.length + ') is CW ' + pathIsCW(path));

                        // Universe polygon is CW
                        // The rest of the polygons are CCW
                        if (pathIsCW(path)) {
                            path = path.slice().reverse();
                        }
                        
                        pathAppend2Table(k);
                    }
                    
                    path = new google.maps.MVCArray(path);
                    google.maps.event.addListener(path, 'set_at', coordinates_textbox_update);

                    paths[k] = path;
                });
                
                polygon.setPaths(new google.maps.MVCArray(paths));
                polygon.setMap(map);
                coordinates_textbox_update();

                map.fitBounds(bounds);

                $('#table_paths').removeClass('hide');
            } catch (error) {
                $('#geojson_alert').removeClass('hide');
                console.log(error);
            }
        }
    });
    
    // Check if the vertices of a path are in following a clockwise direction
    // Adapted from http://www.gamedev.net/topic/564749-2d-polygon-winding-order/
    function pathIsCW(path){
        var a = 0;
        for (var i = 0; i < path.length-1; i++){
            var ps_x = path[i].lng() - path[0].lng();
            var ps_y = path[i].lat() - path[0].lat();
            
            var pe_x = path[i+1].lng() - path[0].lng();
            var pe_y = path[i+1].lat() - path[0].lat();
            
            a += ps_x * (-1 * pe_y) - pe_x * (-1 * ps_y);
        }
        return a > 0;
    };
    function pathIsCCW(path) {
        return ! pathIsCW(path);
    }
    
    function pathGetBounds(path) {
        if ((typeof path.getLength) === 'undefined') {
            path = new google.maps.MVCArray(path);
        }
        
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0; i < path.getLength(); i++) {
            bounds.extend(path.getAt(i));
        }
        return bounds;
    }
    
    function pathsGetBounds(paths) {
        var bounds = new google.maps.LatLngBounds();
        $.each(paths, function(k, path){
            var path_bounds = pathGetBounds(path);
            bounds = bounds.union(path_bounds);
        });
        
        return bounds;
    }
    
    function pathAppend2Table(path_k) {
        $('#table_paths tbody').append('<tr><td>Path ' + path_k + '</td><td><button class="btn btn-mini btn-info" data-action="zoom">Zoom to</button> <button class="btn btn-mini btn-danger" data-action="delete">Delete</button></td></tr>');
    }
});

google.maps.LatLngBounds.prototype.containBounds = function(bounds) {
    var point_sw = bounds.getSouthWest();
    var point_ne = bounds.getNorthEast();
    
    var bounds_are_inside = this.contains(point_sw) && this.contains(point_ne);
    
    return bounds_are_inside;
}