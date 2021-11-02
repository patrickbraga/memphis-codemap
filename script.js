//import map icon
//import { faMapMarker } from '@fortawesome/fontawesome-svg-core';

// Patrick's access token
mapboxgl.accessToken = 'pk.eyJ1IjoicGF0cmlja2JyYWdhIiwiYSI6ImNrdTl4ZDIyZDAwZ3Qyb2xkdXF1NjJiYnYifQ.HGoySsVwUWj8zVyJbw-mRw';

function setupMap() {
    const map = new mapboxgl.Map({
        container: 'map',   //ID of the div element
        //style: showSatellite ? 'mapbox://styles/mapbox/satellite-streets-v11' : 'mapbox://styles/mapbox/streets-v11';
        style: 'mapbox://styles/mapbox/streets-v11', //Mapbox style
        //style: 'mapbox://styles/mapbox/satellite-streets-v11
        center: [-90.015, 35.162], //array in form of [lon, lat] for Memphis
        zoom: 16,
        dragRotate: false, //prevent right-click dragging to rotate, trying to keep as simple as possible
        hash: true //update latlong and zoom level in URL to make sharing easier
    });

    // add search function and navigation controls
    map.addControl(
        new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl
        })
    );

    const nav = new mapboxgl.NavigationControl({ showCompass: false });
    map.addControl(nav);



    map.on('load', () => {
        loadUniversal(map); //load this first so it's beneath the other features
        const fill_layers = ['likely_vacant', 'owner_1and2fam', 'industrial', 'NPI-demolish'];
        fill_layers_label = ['Likely Vacant', 'Owner-Occupied', 'Industrial', 'NPI: Demolish'];

        loadFillLayers(map, fill_layers, ['#bda', '#fdd', '#842', '#bda'], [0.6, 0.7, 0.4, 0.6]);

        console.log("will try to add pinstripes");
        const pinstripe_layers = ['commercial', 'religious', 'public_not_tax_sale', 'rentrehab'];
        pinstripe_layers_label = ['Commercial', 'Religious', 'Publicly Owned', 'NPI Rent-Rehab'];
        loadPinstripeLayers(map);

        const recent_sales_layer = ['recent-sales'];
        recent_sales_layer_label = ['Recent Sales'];
        loadRecentSales(map);

        const dash_layers = ['multifamily', 'duplex', 'tax-sale'];
        dash_layers_label = ['Multifamily', 'Duplex', 'Tax Sale'];
        loadDashLayers(map, dash_layers, ['#a45200', '#ff0178', '#ca050b'], [2, 2, 3], [[4, 2], [4, 2], [2, 1.5]]);

        const line_layers = ['NPIcontrol', 'code5'];
        line_layers_label = ['NPI Control', 'Code Enf 5yrs'];
        loadLineLayers(map, line_layers, ['#33658a', '#ca050b']);

        const text_layers = ['ownerimprov', 'partner', 'vacantbldg'];
        text_layers_label = ['Homeowner Impr.', 'Partner Prop.', 'Vacant Bldg'];
        loadTextLayers(map, text_layers, ['X', 'P', '■']);


        // Combine the arrays into a single one for the menu
        menu = fill_layers
            .concat(pinstripe_layers)
            .concat(recent_sales_layer)
            .concat(dash_layers)
            .concat(line_layers)
            .concat(text_layers);
        menu_labels = fill_layers_label
            .concat(pinstripe_layers_label)
            .concat(recent_sales_layer_label)
            .concat(dash_layers_label)
            .concat(line_layers_label)
            .concat(text_layers_label);

        /* Clickable layers
        Source: https://docs.mapbox.com/mapbox-gl-js/example/toggle-layers/ 
        and slightly modified to display label text instead of variable name */

        for (i = 0; i < menu.length; i++) { // I changed the for loop
            id = menu[i]; // and specified this so that I can also cycle through text
            const link = document.createElement('a');
            link.id = id;
            link.href = '#';
            link.textContent = menu_labels[i];
            link.className = 'active';

            // Show or hide layer when the toggle is clicked.
            link.onclick = function (e) {
                const clickedLayer = this.id; //changed this to id instead of text
                e.preventDefault();
                e.stopPropagation();

                const visibility = map.getLayoutProperty(
                    clickedLayer,
                    'visibility'
                );

                // Toggle layer visibility by changing the layout object's visibility property.
                if (visibility === 'visible') {
                    map.setLayoutProperty(clickedLayer, 'visibility', 'none');
                    this.className = '';
                } else {
                    this.className = 'active';
                    map.setLayoutProperty(
                        clickedLayer,
                        'visibility',
                        'visible'
                    );
                }
            }

            const layers = document.getElementById('menu');
            layers.appendChild(link);
        }

        //loadRecentSales(map);
    });

}

function loadUniversal(map) {
    map.addLayer({
        'id': 'universal',
        'type': 'fill',
        'source': {
            'type': 'geojson',
            'data': './geojson/universal.geojson'
        },
        'layout': {},
        'paint': {
            'fill-color': '#ddd', //#088
            'fill-outline-color': '#055',
            'fill-opacity': 0.25
        }
    });

    // console.log("Universal layer added");

    map.on('click', (e) => {
        var popup = new mapboxgl.Popup({ offset: [0, -15] });
        console.log(`mousedown detected. point ${JSON.stringify(e.point)}`);
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['universal']
        })
        // console.log(JSON.stringify(features[0])); // it works!!
        const feature = features[0];

        popup
            .setLngLat(e.lngLat) //set the popup to appear where the user clicked, since the parcel polygons' coordinates are a nested array of at least four coordinates
            .setHTML(
                `<h3><br>Parcel ID: ${feature.properties.Parcel_ID}<br>Year of sale: ${feature.properties.universal_Sale_Year}</h3> 
                <p>Address: ${feature.properties.Address}</p>
                <p><b>Owner 1:</b> ${feature.properties.Owner_1}
                <br><b>Owner address:</b> ${feature.properties.OwnAddr_1}
                <p><b>Owner 2:</b> ${feature.properties.Owner_2}
                <br><b>Owner address:</b> ${feature.properties.OwnAddr_2} </p>
                <p><b>Current use:</b> ${feature.properties.universal_Current_Use} </p>
                <p><b>Last sale:</b> ${feature.properties.universal_Last_Sale}</p>`)
            .addTo(map);
    });
}

function loadDashLayers(map, layers_array, colors_array, thickness_array, dashes_array) {
    for (i = 0; i < layers_array.length; i++) {
        current_layer = layers_array[i];
        map.addLayer({
            'id': String(current_layer),
            'type': 'line',
            'source': {
                'type': 'geojson',
                'data': `./geojson/${current_layer}.geojson`
            },
            'paint': {
                'line-color': colors_array[i],
                'line-dasharray': dashes_array[i],
                'line-width': thickness_array[i]
            }
        }
        )
    }
}

function loadLineLayers(map, layers_array, colors_array) {
    for (i = 0; i < layers_array.length; i++) {
        current_layer = layers_array[i];
        map.addLayer({
            'id': String(current_layer),
            'type': 'line',
            'source': {
                'type': 'geojson',
                'data': `./geojson/${current_layer}.geojson`
            },
            'paint': {
                'line-color': colors_array[i],
                'line-width': 2
            }
        }
        )
    }
}

function loadTextLayers(map, layers_array, text_array) {
    for (i = 0; i < layers_array.length; i++) {
        current_layer = layers_array[i];
        map.addLayer({
            'id': String(current_layer),
            'type': 'symbol',
            'source': {
                'type': 'geojson',
                'data': `./geojson/${current_layer}.geojson`
            },
            'layout': {
                'text-field': text_array[i],
                'text-size': 10,
                'text-offset': [.35, 0]
            }
        }
        )
    }
}

function loadFillLayers(map, layers_array, colors_array, opacity_array) {
    // to implement: throw an error if layers_array and colors_array are different lengths

    for (i = 0; i < layers_array.length; i++) {
        current_layer = layers_array[i];
        map.addLayer({
            'id': String(current_layer),
            'type': 'fill',
            'source': {
                'type': 'geojson',
                'data': `./geojson/${current_layer}.geojson`
            },
            'paint': {
                'fill-color': colors_array[i],
                'fill-outline-color': '#fff',
                'fill-opacity': opacity_array[i]
            }
        });
    }
}

function loadPinstripeLayers(map) {
    // to implement: throw an error if layers_array and colors_array are different lengths
    //console.log(String(layers_array));
    //console.log(String(image_array));

    map.loadImage('./img/pinstripe-blue.png', (error, img_blue) => {
        if (error) throw error;
        // Add the loaded image to the style's sprite with the ID 'pattern'.
        map.addImage('pinstripe-blue', img_blue);
        map.addSource('religious', {
            type: 'geojson',
            data: './geojson/religious.geojson'
        });

        map.addLayer({
            id: 'religious',
            source: 'religious',
            type: 'fill',
            paint: {
                'fill-pattern': 'pinstripe-blue'
            }
        });
    });

    map.loadImage('./img/pinstripe-yellow.png', (error, img_yellow) => {
        if (error) throw error;
        // Add the loaded image to the style's sprite with the ID 'pattern'.
        map.addImage('pinstripe-yellow', img_yellow);
        map.addSource('commercial', {
            type: 'geojson',
            data: './geojson/commercial.geojson'
        });

        map.addLayer({
            id: 'commercial',
            source: 'commercial',
            type: 'fill',
            paint: {
                'fill-pattern': 'pinstripe-yellow'
            }
        });
    });

    map.loadImage('./img/pinstripe-red.png', (error, img_red) => {
        if (error) throw error;
        // Add the loaded image to the style's sprite with the ID 'pattern'.
        map.addImage('pinstripe-red', img_red);
        map.addSource('public_not_tax_sale', {
            type: 'geojson',
            data: './geojson/public_not_tax_sale.geojson'
        });

        map.addLayer({
            id: 'public_not_tax_sale',
            source: 'public_not_tax_sale',
            type: 'fill',
            paint: {
                'fill-pattern': 'pinstripe-red'
            }
        });
    });

    map.loadImage('./img/hash-green.png', (error, hash_green) => {
        if (error) throw error;
        // Add the loaded image to the style's sprite with the ID 'pattern'.
        map.addImage('hash_green', hash_green);
        map.addSource('rentrehab', {
            type: 'geojson',
            data: './geojson/rentrehab.geojson'
        });

        map.addLayer({
            id: 'rentrehab',
            source: 'rentrehab',
            type: 'fill',
            paint: {
                'fill-pattern': 'hash_green'
            }
        });
    });
}

function loadRecentSales(map) {
    // To load a point marker, you need to do three things within loadImage: addImage, addSource, and addLayer.
    map.loadImage('./img/dot-blue.png', (error, image) => {
        if (error) throw error;
        // Add the loaded image to the style's sprite with the ID 'pointer'.
        map.addImage('pointer', image);
        map.addSource('recent-sales', {
            type: 'geojson',
            data: './geojson/recent-sales.geojson'
        });

        map.addLayer({
            id: 'recent-sales',
            source: 'recent-sales',
            type: 'symbol',
            maxzoom: 24,
            minzoom: 0,
            layout: {
                'icon-image': 'pointer',
                'icon-size': 0.6
            }
        });
    });


}

setupMap();