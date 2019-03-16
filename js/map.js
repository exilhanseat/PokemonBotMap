var settings = $.cookie('pogoraidmap_settings') != null ? JSON.parse($.cookie('pogoraidmap_settings')) : null;

if(settings == null){
	settings = {
		'location': constants.mapbox_map_center,
		'zoom': constants.mapbox_starting_zoom,
		'style': 'streets-v10',
		'layers': [
			'show_exraids',
			'show_raids5',
			'show_raids4',
			'show_raids3',
			'show_raids2',
			'show_raids1',
			'show_exgyms',
			'show_gyms'
		]
    };
}
	 
$(document).ready(function(){	 
    mapboxgl.accessToken = constants.mapbox_api_key;
    
    // Instantiate the map
    var map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/' + settings.style, // initial style
        center: settings.location, // starting position
        zoom: settings.zoom // starting zoom
    });
    
    // Add zoom and rotation controls to the map.
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');
    
    // Add geolocate control to the map.
    map.addControl(new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-left');
        
    // Preload popup HTML templates
    var raidPopupHtml;
    var gymPopupHtml;
    var pokemonPopupHtml
    var attendanceHtml;
    var questPopupHtml;
    
    var raidPopupPromise = $.get('templates/raid_popup.html');
    var gymPopupPromise = $.get('templates/gym_popup.html');
    var pokemonPopupPromise = $.get('templates/pokemon_popup.html');
    var attendancePromise = $.get('templates/raid_attendance.html');
    var questPopupPromise = $.get('templates/quest_popup.html');
    
    $.when(raidPopupPromise, gymPopupPromise, pokemonPopupPromise, attendancePromise, questPopupPromise)
    	.done(function(raidData, gymData, pokemonData, attendanceData, questData) {
			raidPopupHtml = raidData[0];
			gymPopupHtml = gymData[0];
	        pokemonPopupHtml = pokemonData[0];
	        attendanceHtml = attendanceData[0];
	        questPopupHtml = questData[0];
	    });
    
    // Setup style settings
    $('#layer_settings ul li input:radio[value="' + settings.style + '"]').prop('checked', 'checked');
    
    // Handle style switches
    $('#layer_settings ul li input:radio[name="style"]').click(function() {
    	map.setStyle('mapbox://styles/mapbox/' + $(this).attr('value'));
    	settings.style = $(this).attr('value');    
    });
    
    // Setup layer settings
    $('#layer_settings ul li input:checkbox').each(function(){
    	if(settings.layers.includes($(this).attr('value'))){
    		$(this).prop('checked', 'checked');
    	}
    	else{
    		$(this).removeAttr('checked');
    	}
    });
    
    // Handle layer switches   
    var lastUpdateTime = null;

    $('#layer_settings ul li input:checkbox').click(function() {
    	if($(this).is(':checked')){
    		if(!settings.layers.includes($(this).attr('value'))){
	    		settings.layers.push($(this).attr('value'));
	    	}
    	}
    	else{
    		settings.layers = settings.layers.filter(layer => layer != $(this).attr('value'));
    	}
    	
    	lastUpdateTime = null;
    	updateData();
    }); 
    
    // Setup map data object
    var mapData = {
		'exraids': null,
		'raids5': null,
		'raids4': null,
		'raids3': null,
		'raids2': null,
		'raids1': null,
		'exgyms': null,
		'gyms': null,
		'pokemon': null,
		'quests': null
    };   
    
    var updateData = function(){
    	if(lastUpdateTime !== null && Date.now() < lastUpdateTime + (constants.map_refresh_rate * 1000)){
    		window.setTimeout(updateData, 100);
    		return;
    	}
    	else{
    		lastUpdateTime = Date.now();
    	}
    	
    	var promises = [];
    	
	   	var gymsPromise = function(){ return $.getJSON('getgyms.php'); };
	   	var raidPromise = function(){ return $.getJSON('getraids.php'); };
	   	var questsPromise = function(){ return $.getJSON('getquest.php'); };
	   	
	   	if(settings.layers.some(layer => { return layer.includes('gym'); } )){
	   		promises.push(gymsPromise());
	   	}
	   	
	   	if(settings.layers.some(layer => { return layer.includes('raid'); })){
	   		promises.push(raidPromise());
	   	}
	   	
	   	if(settings.layers.includes('show_quests')){
	   		promises.push(questsPromise());
	   	}
	   	
	   	Promise.all(promises).then(data => {
	   		var index = 0;
	   		var gym_data = [], raid_data = [], pokemon_data = [], quests_data = [];
	   		
	   		if(settings.layers.some(layer => { return layer.includes('gym'); } )){
	   			gym_data = data[index++];
	   		}
	   		
	   		if(settings.layers.some(layer => { return layer.includes('raid'); })){
	   			raid_data = data[index++];
	   		}
	   		
	   		
	   		if(settings.layers.includes('show_quests')){
	   			quests_data = data[index++];
	   		}
	   		
	   		mapData.exraids = settings.layers.includes('show_exraids') ? buildRaidLayerJson(raid_data.filter(raid => raid.raid_level == 'X')) : null;
	   		mapData.raids5 = settings.layers.includes('show_raids5') ? buildRaidLayerJson(raid_data.filter(raid => raid.raid_level == 5)) : null;
	   		mapData.raids4 = settings.layers.includes('show_raids4') ? buildRaidLayerJson(raid_data.filter(raid => raid.raid_level == 4)) : null;
	   		mapData.raids3 = settings.layers.includes('show_raids3') ? buildRaidLayerJson(raid_data.filter(raid => raid.raid_level == 3)) : null;
	   		mapData.raids2 = settings.layers.includes('show_raids2') ? buildRaidLayerJson(raid_data.filter(raid => raid.raid_level == 2)) : null;
	   		mapData.raids1 = settings.layers.includes('show_raids1') ? buildRaidLayerJson(raid_data.filter(raid => raid.raid_level == 1)) : null;
	   		
	   		mapData.exgyms = settings.layers.includes('show_exgyms') ? buildGymLayerJson(filterGyms(gym_data, raid_data, true)) : null;
	   		mapData.gyms = settings.layers.includes('show_gyms') ? buildGymLayerJson(filterGyms(gym_data, raid_data, false)) : null;
	   		
	   		mapData.quests = settings.layers.includes('show_quests') ? buildQuestsLayerJson(quests_data) : null;
	   		
	   		updateMap();
	   	});
	   	
	   	window.setTimeout(updateData, constants.map_refresh_rate * 1000);
    };
    
    var filterGyms = function(gyms, raids, filterForExGyms){
        var result = gyms;
        var show_raid_levels = settings.layers.map(layer => layer == 'show_exraids' ? 'X' : layer.substr(layer.length - 1, layer.length));
        
        if(filterForExGyms){
            result = gyms.filter(gym => gym.ex_gym == 1)
        }
        else{
            result = gyms.filter(gym => gym.ex_gym == 0);
        }        
            
        return result.filter(gym => raids.filter(raid => show_raid_levels.includes(raid.raid_level) && raid.gym_id == gym.id).length == 0);
    };
    
    var buildRaidLayerJson = function(raids){
    	return raids
            .map(raid => prepareRaidForRendering(raid))
            .map(raid => {
        		return {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [raid.lon, raid.lat]
                    },
                    'properties': {
                        'title': raid.pokemon_name,
                        'description': renderTemplate(raidPopupHtml, raid),
                        'icon': loadPokemonIcon(raid.pokedex_id),
                        'raid_level': raid.raid_level == 'X' ? 'EX RAID' : '\u272A'.repeat(raid.raid_level),
                        'attendees': raid.raiders != null ? Object.keys(raid.raiders).map(key => { return raid.raiders[key].raiders * 1; }).reduce(function(total, num){ return total + num; } ) : ''
                    }
        		}
        	});
    };
    
    var prepareRaidForRendering = function(raid) {
        raid.ts_start_string = new Date(raid.ts_start * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        raid.ts_end_string = new Date(raid.ts_end * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        var remaining = [];
        
        if(raid.t_left > 3600){
            var hours = Math.floor(raid.t_left / 3600);
            remaining.push(hours + ' Stunde' + (hours != 1 ? 'n' : ''));
            raid.t_left -= hours * 3600;
        }
        
        if(raid.t_left > 60){
            var minutes = Math.floor(raid.t_left / 60);
            remaining.push(minutes + ' Minute' + (minutes != 1 ? 'n' : ''));
            raid.t_left -= minutes * 60;
        }
        
        var seconds = raid.t_left;
        remaining.push(seconds + ' Sekunde' + (seconds != 1 ? 'n' : ''));
        
        raid.t_left_string = remaining.join(', ');
        
        if(raid.raiders == null){
            raid.raiders_set = 0;
        }
        else{
            raid.raiders_set = 1;            
            raid.raiders_string = '';
            
            for (const key in raid.raiders) {
                raid.raiders_string += renderTemplate(attendanceHtml, raid.raiders[key]);
            };
        }
        
        if(raid.move_1 != null && raid.move_2 != null){
            raid.raid_moves_present = 1;
        }
        else{
            raid.raid_moves_present = 0;
        }
        
        return raid;
    };
    
    var buildGymLayerJson = function(gyms) {
		return gyms.map(gym => { 
			return {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [gym.lon, gym.lat]
                },
                'properties': {
                    'title': gym.gym_name,
                    'description': renderTemplate(gymPopupHtml, gym),
                    'icon': loadTeamIcon(gym.team)
                }
  			}
		});
    };
    
    var buildQuestsLayerJson = function(quests){
    	return quests
	        .map(quest => prepareQuestForRendering(quest))
	        .map(quest => {
	    		return {
	    			'type': 'Feature',
	                'geometry': {
	                    'type': 'Point',
	                    'coordinates': [quest.lon, quest.lat]
	                },
	                'properties': {
	                    'title': quest.quest_info,
	                    'description': renderTemplate(questPopupHtml, quest),
	                    'icon': quest.icon
	                }
	    		}
	    	});
    };
    
    var prepareQuestForRendering = function(quest){    	
    	switch(quest.quest_reward_type){
			case('2'):{
				quest.reward_amount = quest.quest_item_amount + 'x ';
				quest.reward_image = 'icons/quests/quest_reward_' + quest.quest_item_id + '.png';
				break;
			}
			case('3'):{
				quest.reward_amount = quest.quest_stardust + ' '; 
				quest.reward_image = 'icons/quests/quest_reward_stardust.png';
				break;
			}
			case('7'):{
				quest.reward_amount = '';
				quest.reward_image = 'icons/' + constants.map_icon_pack + '/id_' + quest.quest_pokemon_id + '.png';
				break;
			}    		
		}
    	
    	quest.icon = loadQuestIcon(quest);    	
    	return quest;
    };
    
    var renderTemplate = function(template, obj){
    	var result = template;
    	
    	for (const key in obj){
    		result = result.split('##' + key + '##').join(obj[key]);
    	}
    	
    	return result;
    };
    
    var updateMap = function(){
    	if(!map.isStyleLoaded()){
    		window.setTimeout(updateMap, 100);
    		return;
    	}
    	
    	for (const key in mapData) {
    		  var value = mapData[key];
    		  
    		  if(value == null){	  
    			  if (map.getLayer(key) !== undefined) {
    				  map.removeLayer(key);
    			  }
    			  
    			  if(map.getSource(key) !== undefined){
    				  map.removeSource(key);
    			  }
    		  }
    		  else{    		
    			  if(!map.getSource(key)){
    				  map.addSource(key, { type: 'geojson', data: { 'type': 'FeatureCollection', 'features': value} });
    			  }
    			  
    			  if (!map.getLayer(key)) {    				  
    				  map.addLayer({
	    				  'id': key,
	    				  'type': 'symbol',
	    				  'source': key,
	    				  'layout': {
				              'text-field': '{raid_level} {attendees}',
                              'icon-anchor': 'bottom',
                              'text-anchor': 'center',                              
	    					  'icon-image': '{icon}',
	    					  'icon-size': 0.5,
	    					  'icon-allow-overlap': true,
	    					  'text-allow-overlap': true
	    				  },
                          'paint': {
                            'text-opacity': 0.5
                          }
					  });
    			  }
    			  else{
        			  map.getSource(key).setData({ 'type': 'FeatureCollection', 'features': value});
    			  }
    		  }
    	}
    };
    
    var loadedImages = [];
    
    var loadTeamIcon = function(team) {
    	var name = 'gym';
    	var url = 'icons/gym.png';
    	
    	switch(team){
	    	case '1':
	    	case 'mystic':{
	    		name = 'mystic';
	    		url = 'icons/mystic.png';
	    		break;
	    	}
	    	case '2':
	    	case 'valor':{
				name = 'valor';
				url = 'icons/valor.png';
				break;
	    	}
	    	case '3':
	    	case 'instinct':{
				name = 'instinct';
				url = 'icons/instinct.png';
				break;
	    	}
    	}
    	
    	loadImage(name, url);
        return name;
    };
    
    var loadPokemonIcon = function(pokedex_id) {    	
    	var name = 'icon_pokedex_' + pokedex_id;
    	var url = 'icons/' + constants.map_icon_pack + '/id_' + pokedex_id + '.png';
    	loadImage(name, url);    	
    	return name;
    };
    
    var loadQuestIcon = function(quest){
    	var pokestop_name = 'quest_pokestop';
    	var pokestop_url = 'icons/quests/pokestop.png';
    	
    	switch(quest.quest_reward_type){
			case('2'):{
				name = 'reward_item_' + quest.quest_item_id;
				url = 'icons/quests/quest_reward_' + quest.quest_item_id + '.png';
				break;
			}
			case('3'):{
				name = 'reward_stardust';
				url = 'icons/quests/quest_reward_stardust.png';
				break;
			}
    		case('7'):{
    			name = 'reward_pokemon_' + quest.quest_pokemon_id;
    			url = 'icons/' + constants.map_icon_pack + '/id_' + quest.quest_pokemon_id + '.png';
    			break;
    		}    		
    	}
    	
    	name = pokestop_name + '-' + name;
    	mergeIcons(name, url, pokestop_url);
    	
    	return name;
    }
    
    var loadImage = function(name, url){
    	if(!loadedImages.includes(name)){
        	loadedImages.push(name);
        	
        	map.loadImage(url, function(error, image){
	        	map.addImage(name, image);
        	});
        }
    }
    
    map.on('load', function () {        
        for (const key in mapData) {
    	   	 map.on('click', key, function(e) { handleClick(e); });
    		 map.on('mouseenter', key, function() { handleMouseEnter(); });
    		 map.on('mouseleave', key, function() { handleMouseLeave(); });
        };
    });
    
    map.on('style.load', function() {  
        loadedImages = [];
    	updateData();
    });
    
    map.on('moveend', function(){
    	var location = map.getCenter();
    	settings.location = [ location.lng, location.lat ];
    });
    
    map.on('zoomend', function(){
    	settings.zoom = map.getZoom();
    });
			 
	var handleClick = function (e) {
		 var coordinates = e.features[0].geometry.coordinates.slice();
		 var description = e.features[0].properties.description;
		  
		 // Ensure that if the map is zoomed out such that multiple
		 // copies of the feature are visible, the popup appears
		 // over the copy being pointed to.
		 while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
			 coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
		 }
		  
		 new mapboxgl.Popup()
			 .setLngLat(coordinates)
			 .setHTML(description)
			 .addTo(map);
	 };
			 
	var handleMouseEnter = function () {
		 map.getCanvas().style.cursor = 'pointer';
	 };
	  
			 
	var handleMouseLeave = function () {
		 map.getCanvas().style.cursor = '';
	 };
	 
	 var mergeIcons = function(name, image_fg, image_bg) {
    	if(!loadedImages.includes(name)){
	        loadedImages.push(name);
			var c = document.createElement('canvas');
			c.width = 128;
			c.height = 128;
			var ctx=c.getContext("2d");
			var imageObj1 = new Image();
			var imageObj2 = new Image();
			imageObj1.src = image_bg;
			 
			imageObj1.onload = function() {
			    ctx.drawImage(imageObj1, 0, 0);
			    imageObj2.src = image_fg;
			    imageObj2.onload = function() {
			       ctx.drawImage(imageObj2, 0, 0);			       
			       map.addImage(name, ctx.getImageData(0, 0, 128, 128));
			    }
			};
    	}
	 }
});
 
$(window).on('unload', function(){		 
		 $.cookie('pogoraidmap_settings', JSON.stringify(settings), { expires: 30 });
});