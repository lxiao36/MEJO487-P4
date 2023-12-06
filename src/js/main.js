let map;
let geocoder;
let playerDataByCity = {};
let topCities = [];
const icons = {
  1: "images/unc-head.png",
  2: "images/unc-head.png",
  3: "images/unc-head.png",
  4: "images/unc-head.png",
  5: "images/unc-head.png",
  6: "images/unc-head.png",
};

const SumKeys = [
  "Yrs",
  "G",
  "MP",
  "FG",
  "3P",
  "FT",
  "TRB",
  "AST",
  "STL",
  "BLK",
  "TOV",
  "PF",
  "PTS",
];
const AvgKeys = [
  "FG%",
  "3P%",
  "FT%",
  "MP Per Game",
  "PTS Per Game",
  "TRB Per Game",
  "AST Per Game",
];

async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 35.7596, lng: -79.0193 }, // Centered on North Carolina
    zoom: 7,
  });

  geocoder = new google.maps.Geocoder();

  processJsonData("data/nba-ncdemo.json"); // Replace with the path to your JSON file
}

function initializeAggregatedStats() {
  let stats = {};
  SumKeys.forEach((key) => (stats[key] = 0));
  AvgKeys.forEach((key) => (stats[key] = 0));
  return stats;
}

function updateAggregatedStats(stats, player) {
  SumKeys.forEach((key) => (stats[key] += player[key]));
  AvgKeys.forEach((key) => (stats[key] += player[key])); // Adjust this as needed for averages
}

function getTopCities(cityData) {
  // Create an array from the cityData object and sort it by the number of players
  let sortedCities = Object.entries(cityData).sort(
    (a, b) => b[1].players.length - a[1].players.length
  );
  return sortedCities.slice(0, 100).map((entry) => entry[0]); // Return the top 6 cities
}

function calculateAverages(cityData) {
  for (let cityKey in cityData) {
    if (cityData.hasOwnProperty(cityKey)) {
      let stats = cityData[cityKey].aggregatedStats;
      AvgKeys.forEach((key) => {
        if (cityData[cityKey].players.length > 0) {
          stats[key] = stats[key] / cityData[cityKey].players.length;
        }
      });
    }
  }
}

function rankCitiesByStat(cityData, key, isAvg = false) {
  // Create an array from the cityData and sort it based on the key
  let sortedCities = Object.entries(cityData).sort((a, b) => {
    return isAvg
      ? b[1].aggregatedStats[key] - a[1].aggregatedStats[key]
      : b[1].aggregatedStats[key] - a[1].aggregatedStats[key];
  });

  // Create a ranking map
  let rankings = {};
  sortedCities.forEach((entry, index) => {
    rankings[entry[0]] = index + 1; // Ranking starts at 1
  });

  return rankings;
}

function processJsonData(jsonUrl) {
  $.getJSON(jsonUrl, function (players) {
    let cityData = {};

    players.forEach((player) => {
      let cityKey = player.City + ", " + player.Region;
      if (!cityData[cityKey]) {
        cityData[cityKey] = {
          players: [],
          aggregatedStats: initializeAggregatedStats(),
        };
      }
      cityData[cityKey].players.push(player);
      updateAggregatedStats(cityData[cityKey].aggregatedStats, player);
    });

    calculateAverages(cityData);

    // Calculate rankings for each key
    let rankings = {};
    SumKeys.forEach((key) => {
      rankings[key] = rankCitiesByStat(cityData, key);
    });
    AvgKeys.forEach((key) => {
      rankings[key] = rankCitiesByStat(cityData, key, true);
    });

    // Include rankings in cityData
    for (let cityKey in cityData) {
      if (cityData.hasOwnProperty(cityKey)) {
        cityData[cityKey].rankings = {};
        SumKeys.forEach((key) => {
          cityData[cityKey].rankings[key] = rankings[key][cityKey];
        });
        AvgKeys.forEach((key) => {
          cityData[cityKey].rankings[key] = rankings[key][cityKey];
        });
      }
    }

    for (let city in cityData) {
      if (cityData.hasOwnProperty(city)) {
        let [cityName, region] = city.split(", ");
        getGeocodeAndAddMarker(cityName, region, cityData[city]);
      }
    }

    topCities = getTopCities(cityData);
    // Generate the list of top cities
    generateTopCitiesList(topCities, cityData, rankings);
  });
}

function generateTopCitiesList(topCities, cityData, rankings) {
  const listContainer = document.getElementById("cityList");
  listContainer.innerHTML = ""; // Clear existing content

  topCities.forEach((cityKey) => {
    const cityInfo = cityData[cityKey];
    const listItem = document.createElement("li");
    listItem.id = cityKey.replace(/[^a-zA-Z0-9]/g, "_"); // Replace spaces and special characters

    let playerDetails = '<div class="col-lg-6">';
    if (cityInfo.players.length > 0) {
      // Start the table and add table headers
      playerDetails +=
        '<div class="table-responsive" style="max-height:550px;overflow-y:auto;"><table class="table">';
      playerDetails += "<thead><tr><th>Player</th>";
      SumKeys.concat(AvgKeys).forEach((key) => {
        playerDetails += `<th>${key}</th>`;
      });
      playerDetails += "</tr></thead><tbody>";

      // Add table rows for each player
      cityInfo.players.forEach((player) => {
        playerDetails += `<tr><td><strong>${player.Player}</strong></td>`;
        SumKeys.concat(AvgKeys).forEach((key) => {
          playerDetails += `<td>${player[key]}</td>`;
        });
        playerDetails += "</tr>";
      });

      playerDetails += "</tbody></table></div>";
    } else {
      playerDetails += "<p>No player data available for this city.</p>";
    }

    playerDetails += "</div>"; // Close playerDetails column

    let rankingDetails = '<div class="col-lg-6">';
    SumKeys.forEach((key) => {
      rankingDetails += `<p class="article-space"><strong>${key} Total:</strong> ${cityInfo.aggregatedStats[key]} (Rank: ${rankings[key][cityKey]})</p>`;
    });
    AvgKeys.forEach((key) => {
      rankingDetails += `<p class="article-space"><strong>${key} Average:</strong> ${cityInfo.aggregatedStats[
        key
      ].toFixed(2)} (Rank: ${rankings[key][cityKey]})</p>`;
    });
    rankingDetails += "</div>"; // Close rankingDetails column

    listItem.innerHTML = `
          <h3>${cityKey}</h3>
          <p>Total Players: ${cityInfo.players.length}</p>
          <div class="row">
              ${playerDetails}
              ${rankingDetails}
          </div>
      `;

    listContainer.appendChild(listItem);
  });
}

function getGeocodeAndAddMarker(city, region, cityData) {
  geocoder.geocode(
    { address: city + ", " + region },
    function (geocodeResults, geocodeStatus) {
      if (geocodeStatus === "OK") {
        // Get the location from geocode results
        let location = geocodeResults[0].geometry.location;

        // Determine if this city is one of the top cities
        let rank = topCities.indexOf(city + ", " + region) + 1; // '+ 1' because indices start at 0 but ranks start at 1
        let icon =
          rank > 0
            ? {
                url: icons[rank],
                scaledSize: new google.maps.Size(40, 40), // Scale the icon to 40x40 pixels
              }
            : null;

        let marker = new google.maps.Marker({
          map: map,
          position: location,
          title: city,
          icon: icon,
        });

        let cityKey = city + ", " + region;
        let safeCityId = cityKey.replace(/[^a-zA-Z0-9]/g, "_"); // Replace spaces and special characters

        // Use Places API to find a photo of the city
        let placesService = new google.maps.places.PlacesService(map);
        placesService.nearbySearch(
          {
            location: location,
            radius: 1000, // Search within 5 km radius from city center
            type: ["stadium", "university"], // Modify types as needed
          },
          function (placesResults, placesStatus) {
            if (
              placesStatus === google.maps.places.PlacesServiceStatus.OK &&
              placesResults[0].photos
            ) {
              // Get the URL of the first photo
              let photoUrl = placesResults[0].photos[0].getUrl();

              // Generate HTML content for the info window
              let infoWindowContent = `
                <div class="info-window">
                <h3>${city}</h3> 
                <p class="window-rank">Has ${cityData.players.length} Players</p>
                `;

              // Add SumKeys data with ranking check
              SumKeys.forEach((key) => {
                if (cityData.rankings[key] <= 5) {
                  infoWindowContent += `<p class="window-rank">Is top ${cityData.rankings[key]} in Total ${key}</p>`;
                } else {
                  infoWindowContent += ``;
                }
              });
              // Add AvgKeys data with ranking check
              AvgKeys.forEach((key) => {
                if (cityData.rankings[key] <= 5) {
                  infoWindowContent += `<p class="window-rank">Is top ${cityData.rankings[key]} in Average ${key}</p>`;
                } else {
                  infoWindowContent += ``;
                }
              });

              infoWindowContent += `
                <p class="rm-button"><a href="#${safeCityId}" onclick="scrollToCitySection('${safeCityId}')">Read more</a></p>
                <img src="${photoUrl}" 
                alt="Image of ${city}" 
                style="width:500px;height:auto;">`;

              /*
              if (rank > 0) {
                // Add a link to navigate to the list section
                infoWindowContent += `<p><a href="#topCitiesList" onclick="scrollToList('${
                  city + ", " + region
                }')">View more details</a></p>`;
              }
*/
              /*
              if (cityData.players.length > 0) {
                infoWindowContent +=
                  '<div style="max-height:100px;overflow-y:auto;">'; // Add a scrollable container
                cityData.players.forEach((player) => {
                  infoWindowContent += `<div class="player-stats"><p><strong>${player.Player}</strong><br>`;
                  infoWindowContent += `Yrs: ${player.Yrs}, G: ${player.G}, MP: ${player.MP}, FG: ${player.FG}, 3P: ${player["3P"]}, FT: ${player.FT}<br>`;
                  infoWindowContent += `PTS: ${player.PTS}, TRB: ${player.TRB}, AST: ${player.AST}, STL: ${player.STL}, BLK: ${player.BLK}</p>`;
                  infoWindowContent += `PTS Per Game: ${player["PTS Per Game"]}, TRB: ${player.TRB}, AST: ${player.AST}, STL: ${player.STL}, BLK: ${player.BLK}</p>`;
                });
                infoWindowContent += "</div>";
              } else {
                infoWindowContent +=
                  "<p>No player data available for this city.</p>";
              }
*/
              let infoWindow = new google.maps.InfoWindow({
                content: infoWindowContent,
              });

              marker.addListener("click", function () {
                infoWindow.open(map, marker);
              });
            } else {
              console.error("No places found or no photos available");
            }
          }
        );
      } else {
        console.error(
          "Geocode was not successful for the following reason: " +
            geocodeStatus
        );
      }
    }
  );
}

function scrollToList(cityKey) {
  // Smooth scroll to the list section
  document
    .getElementById("topCitiesList")
    .scrollIntoView({ behavior: "smooth" });

  // Optional: Highlight the selected city in the list
  const listItems = document.querySelectorAll("#cityList li");
  listItems.forEach((item) => {
    if (item.querySelector("h3").textContent === cityKey) {
      item.style.backgroundColor = "#e0e0e0"; // Highlight color
    } else {
      item.style.backgroundColor = ""; // Reset color
    }
  });
}

function scrollToMap() {
  document.getElementById("map").scrollIntoView({ behavior: "smooth" });
}

window.onscroll = function () {
  var buttonImage = document.getElementById("backToMapImage");
  var mapTop = document.getElementById("map").offsetTop;
  var scrollPosition =
    document.documentElement.scrollTop || document.body.scrollTop;

  if (scrollPosition < mapTop) {
    buttonImage.src = "images/unc-head.png"; // Default image
  } else if (scrollPosition < mapTop + 500) {
    buttonImage.src = "images/unc-mj.png"; // Image when moving away from the map
  } else {
    buttonImage.src = "images/unc-head.png"; // Image when far away from the map
  }
};

initMap();
