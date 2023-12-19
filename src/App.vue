<script setup>
import { reactive, ref, onMounted } from 'vue'


let crime_url = ref('');
let dialog_err = ref(false);
let table = reactive([]);  //table for our database
let map_codes = reactive({});
let map_neighborhoods = reactive({});
let map_incidents = reactive({});
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
            {location: [44.942068, -93.020521], marker: null, name: "Conway/Battlecreek/Highwood"},
            {location: [44.977413, -93.025156], marker: null, name: "Greater East Side"},
            {location: [44.931244, -93.079578], marker: null, name: "West Side "},
            {location: [44.956192, -93.060189], marker: null, name: "Dayton's Bluff "},
            {location: [44.978883, -93.068163], marker: null, name: "Payne/Phalen"},
            {location: [44.975766, -93.113887], marker: null, name: "North End"},
            {location: [44.959639, -93.121271], marker: null, name: "Thomas/Dale(Frogtown) "},
            {location: [44.947700, -93.128505], marker: null, name: "Summit/University"},
            {location: [44.930276, -93.119911], marker: null, name: "West Seventh"},
            {location: [44.982752, -93.147910], marker: null, name: "Como"},
            {location: [44.963631, -93.167548], marker: null, name: "Hamline/Midway"},
            {location: [44.973971, -93.197965], marker: null, name: "St. Anthony"},
            {location: [44.949043, -93.178261], marker: null, name: "Union Park"},
            {location: [44.934848, -93.176736], marker: null, name: "Macalester-Groveland"},
            {location: [44.913106, -93.170779], marker: null, name: "Highland"},
            {location: [44.937705, -93.136997], marker: null, name: "Summit Hill"},
            {location: [44.949203, -93.093739], marker: null, name: "Capitol River"}
        ]
    }
);

//Styling rows for color based on the crime commited:

const styleTableRows = (incident)=>{
    if( 
       incident.toLowerCase().includes("Arson") || incident.toLowerCase().includes("Assault") || incident.toLowerCase().includes("Homicide") || incident.toLowerCase().includes("Murder") ||incident.toLowerCase().includes("Rape") || incident.toLowerCase().includes("Robbery"))
       { return "highlight-red";}  //violent crimes - RED
    else if(incident.toLowerCase().includes("Burglary") || incident.toLowerCase().includes("Graffiti") || incident.toLowerCase().includes("Propety") || incident.toLowerCase().includes("Theft"))
    {return "highlight-orange";} //property damage crimes - ORANGE
    else { return "highlight-yellow";} //Any other crime not mentioned above - YELLOW
    }


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

    map.neighborhood_markers.forEach((value) => {
    //for each neighborhood replace the marker with a numbered marker
    let marker = L.marker(value.location).addTo(map.leaflet);
    marker.bindPopup(`<b>${value.name}</b>`);
    value.marker = marker;

  });

});

function getReqsFromURL(type){   //Get requests from localhost:8000/codes etc.
    console.log(crime_url.value);
    return fetch(`${crime_url.value}` + type).then((response) => response.json())
}

// FUNCTIONS
// Function called once user has entered REST API URL
function initializeCrimes() {
    
    Promise.all([   // need to get every single type of data
    getReqsFromURL("/codes"),
    getReqsFromURL("/incidents"),
    getReqsFromURL("/neighborhoods"),
  ]).then(([codes,incidents,neighborhoods])=>{
        //get codes from json
        codes.forEach((code)=>{
            map_codes[codes.code] = code.type; //maps what type of incident happened: homicide, murder, robbery, etc.
            // console.log(code.type);
        });

        var crime_counter = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];  //array that stores values for 
        //get incidents from json
        incidents.forEach((incident)=>{
            // console.log(incident);
            // console.log(incident.neighborhood_number);
             //loop through incidents            
            crime_counter[incident.neighborhood_number-1]++;
            
        });
        console.log(crime_counter);
        map.neighborhood_markers.forEach((value,index) => {
        value.marker._popup.setContent(value.name+"<br/> Total Crimes:"+crime_counter[index].toString());
        });

        //get neighborhoods from json
        neighborhoods.forEach((neighborhood)=>{
            //  console.log(neighborhood);
            // console.log("bruh");
            // console.log(neighborhood.id);
            map_neighborhoods[neighborhood.id] = neighborhood.name;
        });
    // console.log(crime_url.value);
    // console.log("howdy")
    // console.log(data);
  }).catch((err) => {
      console.log("error message");
      console.log(err);
    });
  }



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



//NEW INCIDENT FORM STUFF

    //Map user input to a new incident
    let newIncident = reactive({
    case_number: '',
    date: '',
    time: '',
    code: '',
    incident: '',
    police_grid: '',
    neighborhood_number: '',
    block: ''
});

  async function createIncident() {
  try {
    const response = await fetch(`${crime_url.value}/new-incident`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newIncident),
    });

    if (response.ok) {  //fetch completed
        newIncident = {
        case_number: '',
        date: '',
        time: '',
        code: '',
        incident: '',
        police_grid: '',
        neighborhood_number: '',
        block: ''
      };

        window.alert("New Incident Created!");
    } else { //error
        console.log(JSON.stringify(newIncident));
        window.alert("New Incident Not Created!");
        console.log("New Incident Not Created!");
    }

  } catch (error) {
    console.log(error); //error message
  }
}



async function deleteIncident(){
    try{
    const response = await fetch(`${crime_url.value}(/remove-incident`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
}catch(error){

}
} //NOT DONE YET

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


            <br><br><br><br>
            <h3> Create a New Incident</h3>
            <form> 
                <label>Case Number: </label>
                    <input id="case_number" type="text" v-model="newIncident.case_number">
                <label>Date:</label>
                    <input id="date" type="text" placeholder="YYYY-MM-DD" v-model="newIncident.date" >
                <label>Time:</label>
                    <input id="time" type="text" v-model="newIncident.time">
                <label>Code:</label>
                    <input id="code" type="text" v-model="newIncident.code">
                <label>Incident</label>
                    <input id="incident" type="text" placeholder="Theft, Burglary, etc..." v-model="newIncident.incident">
                <label>Police Grid:</label>
                    <input id="police_grid" type="text" v-model="newIncident.police_grid">
                <label>Neighborhood Number:</label>
                    <input id="neighborhood_number" type="text" v-model="newIncident.neighborhood_number">
                <label>Block:</label>
                <input id="block" type="text" v-model="newIncident.block">

                <button class="button" type="button" @click="createIncident">Create a New Incident </button>
            </form>
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
