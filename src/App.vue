<script setup>
import { reactive, ref, onMounted } from 'vue'


let crime_url = ref('');
let dialog_err = ref(false);
let table = reactive([]);  //table for our database
let neighborhood_numbers = reactive([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
]);  //for markers
let map = reactive(
    {
        leaflet: null,
        center: {
            lat: 44.955139,   //default latitude coords
            lng: -93.102222,  //default longitude coords
            address: ''
        },
        zoom: 12,
        bounds: {
            nw: {lat: 45.008206, lng: -93.217977},
            se: {lat: 44.883658, lng: -92.993787}
        },
        neighborhood_markers: [
            {location: [44.942068, -93.020521], marker: "17 street"},
            {location: [44.977413, -93.025156], marker: "18 street"},
            {location: [44.931244, -93.079578], marker: null},
            {location: [44.956192, -93.060189], marker: null},
            {location: [44.978883, -93.068163], marker: null},
            {location: [44.975766, -93.113887], marker: null},
            {location: [44.959639, -93.121271], marker: null},
            {location: [44.947700, -93.128505], marker: null},
            {location: [44.930276, -93.119911], marker: null},
            {location: [44.982752, -93.147910], marker: null},
            {location: [44.963631, -93.167548], marker: null},
            {location: [44.973971, -93.197965], marker: null},
            {location: [44.949043, -93.178261], marker: null},
            {location: [44.934848, -93.176736], marker: null},
            {location: [44.913106, -93.170779], marker: null},
            {location: [44.937705, -93.136997], marker: null},
            {location: [44.949203, -93.093739], marker: null}
        ]
    }
);

// Vue callback for once <template> HTML has been added to web page
onMounted(() => {
    // Create Leaflet map (set bounds and valied zoom levels)
    map.leaflet = L.map('leafletmap').setView([map.center.lat, map.center.lng], map.zoom);  //controls where view is
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 11,
        maxZoom: 18
    }).addTo(map.leaflet);
    map.leaflet.setMaxBounds([[44.883658, -93.217977], [45.008206, -92.993787]]);

    // Get boundaries for St. Paul neighborhoods
    let district_boundary = new L.geoJson();
    district_boundary.addTo(map.leaflet);
    fetch('data/StPaulDistrictCouncil.geojson')
    .then((response) => {
        return response.json();
    })
    .then((result) => {
        result.features.forEach((value) => {
            district_boundary.addData(value);
        });
    })
    .catch((error) => {
        console.log('Error:', error);
    });
});


function getReqsFromURL(type){   //Get requests from localhost:8000/codes etc.
    return fetch("http://localhost:8000" + type)
    .then((response) => response.json())

    .catch((err) => {
      console.log(err);
    });
}

// FUNCTIONS
// Function called once user has entered REST API URL
function initializeCrimes() {
    Promise.all([   // need to get every single type of data
    getReqsFromURL("/codes"),
    getReqsFromURL("/incidents"),
    getReqsFromURL("/neighborhoods"),
  ]).then((data)=>{
    console.log("howdy")
     onsole.log(data);
  });
  } //NOT WORKING AT THE MOMENT



function refresh(){  //refreshes page's address and lat/long values when map is moved around
    let center = map.leaflet.getCenter();
    let latitude = document.getElementById("latitude");
    let longitude = document.getElementById("longitude");
    let addy = document.getElementById("address");

    latitude.value = center.lat;
    longitude.value = center.lng;
    // console.log(longitude.value);
    // console.log(latitude.value);
    map.center.lat = center.lat;
    map.center.lng = center.lng;
    fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + map.center.lat + "&lon=" + map.center.lng)
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        // console.log(json);
        addy.value = json.display_name;
        // console.log(addy.value);
        map.center.address = json.display_name;
        // console.log(map.center.address);
      });
    }

// Function called when user presses 'OK' on dialog box
function closeDialog() {
  let dialog = document.getElementById("rest-dialog");
  let url_input = document.getElementById("dialog-url");
  if (crime_url.value !== "" && url_input.checkValidity()) {
    dialog_err.value = false;
    dialog.close();
    initializeCrimes();
    map.leaflet.on("moveend",refresh);  //updates coords/location when user stops moving map/mouse
  } else {
    dialog_err.value = true;
  }

  //SHORT-CUT: Press enter to search instead of having to click go
  var input = document.getElementById("address");
    input.addEventListener("keypress", function(event){
        if (event.key ==="Enter"){
            event.preventDefault();
            clickGo();
        }
    });

}

function clickGo() {
    let addy = document.getElementById("address").value;  //address user enters
      addy = addy.replaceAll(" ", "+"); //replace white space with '+' to concat
      let nomUrlWithAddress = "https://nominatim.openstreetmap.org/search?q="  + addy + "+Saint+Paul+Minnesota&format=json";   //add st paul and MN to make sure we get location in st paul if there are others
        fetch(nomUrlWithAddress).then((response) => {
            return response.json();
            })
            .then((json) => {
                //check if address coords are inbounds
                if(json[0].lat > 45.008206 ) { 
                    json[0].lat = 45.008206;
                }else if(json[0].lat < 44.883658) {
                    json[0].lat = 44.883658;
                } else if(json[0].lon > -92.993787 ) {  
                    json[0].lon = -92.993787;
                } else if(json[0].lon < -93.217977){
                    json[0].lon = -93.217977;
                }
                // console.log(json[0].lon);
                // console.log(json[0].lat);

                //update new center of map
                map.center.lat = json[0].lat;  //latitude 
                map.center.lng = json[0].lon;  //longitude
                // console.log("test");
                // console.log(map.center.lat);
                // console.log(json);
            map.leaflet.setView((L.latLng(json[0].lat, json[0].lon)), 18,);

                }).catch((error)=>{
                    console.log(error);
                    window.alert("Address out of bounds or does not exist!");
                })      
    };

</script>

<template>
    <dialog id="rest-dialog" open>
        <h1 class="dialog-header">St. Paul Crime REST API</h1>
        <label class="dialog-label">URL: </label>
        <input id="dialog-url" class="dialog-input" type="url" v-model="crime_url" placeholder="http://localhost:8000" />
        <p class="dialog-error" v-if="dialog_err">Error: must enter valid URL</p>
        <br/>
        <button class="button" type="button" @click="closeDialog">OK!</button>
    </dialog>

    <div class="grid-container ">
        <div class="grid-x grid-padding-x">
            <div id="leafletmap" class="cell auto"></div>
        </div>
        <div class="ui-row">
            <label>Please enter a valid address:</label>
                <input id="address" placeholder="ex. Downtown St. Paul" type="text" />

            <label>Latitude: </label>
                <input id="latitude" type="text" disabled/>
            <label>Longitude: </label>
                <input id="longitude" type="text" disabled/>
        </div>
        <div class="ui-row">
            <button class="button" type="button" @click="clickGo">GO!</button> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

            <button class="button" type="button" data-toggle="new-incident-dropdown">Create a New Incident</button>
        </div>
    </div>
    <ul>
        <li v-for="item in table">{{ item }}</li>
    </ul>
    
</template>

<style>

* {
    font-size: 1rem;
}
#rest-dialog {
    width: 20rem;
    margin-top: 1rem;
    z-index: 1000;
}

#leafletmap {
    height: 500px;
}

.dialog-header {
    font-size: 1.2rem;
    font-weight: bold;
}

.dialog-label {
    font-size: 1rem;
}

.dialog-input {
    font-size: 1rem;
    width: 100%;
}

.dialog-error {
    font-size: 1rem;
    color: #D32323;
}

button {
    background-color: chocolate;
    color: brown;
    border: 0;
    box-shadow: none;
    padding: 0.5rem 1rem;
    cursor:pointer;
}


.ui-row {
    margin: 1rem;
    width: 400px;
}

</style>
