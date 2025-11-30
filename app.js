// Load CSV
d3.csv("data/netflix.csv").then(data => {

    // Convert numeric fields
    data.forEach(d => {
        d.imdb_score = +d.imdb_score;
        d.release_year = +d.release_year;
    });

    // Populate genre dropdown
    populateGenres(data);

    // Draw initial charts
    drawRatingHistogram(data);
    drawGenreChart(data);
    drawTimeline(data);
    drawTypeComparison(data);
    drawTopCards(data);

    // Add filter listeners
    document.getElementById("genreFilter").addEventListener("change", () => updateAll(data));
    document.getElementById("typeFilter").addEventListener("change", () => updateAll(data));
    document.getElementById("yearSlider").addEventListener("input", function() {
        document.getElementById("yearValue").textContent = this.value;
        updateAll(data);
    });
});

// FILTERING LOGIC
function applyFilters(data) {
    let genre = document.getElementById("genreFilter").value;
    let type = document.getElementById("typeFilter").value;
    let year = +document.getElementById("yearSlider").value;

    return data.filter(d =>
        (genre === "All" || d.genre.includes(genre)) &&
        (type === "All" || d.type === type) &&
        (d.release_year >= year)
    );
}

function updateAll(originalData) {
    const filtered = applyFilters(originalData);

    drawRatingHistogram(filtered);
    drawGenreChart(filtered);
    drawTimeline(filtered);
    drawTypeComparison(filtered);
    drawTopCards(filtered);
}

// Populate genres in dropdown
function populateGenres(data) {
    const genres = new Set();

    data.forEach(d => {
        d.genre.split(",").forEach(g => genres.add(g.trim()));
    });

    genres.forEach(g => {
        let option = document.createElement("option");
        option.value = g;
        option.textContent = g;
        document.getElementById("genreFilter").appendChild(option);
    });
}

// -------------------- CHART FUNCTIONS --------------------

// Histogram
function drawRatingHistogram(data) {
    d3.select("#ratingHistogram").html(""); // Clear old chart

    // Basic example
    d3.select("#ratingHistogram")
        .append("p")
        .text("Histogram will go here.");
}

// Genre bar chart
function drawGenreChart(data) {
    d3.select("#genreBarChart").html("");

    d3.select("#genreBarChart")
        .append("p")
        .text("Genre bar chart will go here.");
}

// Timeline
function drawTimeline(data) {
    d3.select("#timelineChart").html("");

    d3.select("#timelineChart")
        .append("p")
        .text("Timeline chart will go here.");
}

// Type comparison
function drawTypeComparison(data) {
    d3.select("#typeComparison").html("");

    d3.select("#typeComparison")
        .append("p")
        .text("Movies vs TV Shows comparison will go here.");
}

// Top 10 cards
function drawTopCards(data) {
    d3.select("#topCards").html("");

    d3.select("#topCards")
        .append("p")
        .text("Top 10 cards will go here.");
}
