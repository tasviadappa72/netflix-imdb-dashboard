// Path to the CSV file (make sure data/netflix.csv exists)
const DATA_PATH = "data/netflix.csv";

// Chart layout settings
const chartMargin = { top: 20, right: 20, bottom: 35, left: 45 };
const chartWidth = 550;
const chartHeight = 260;

// ---- Helper: create / clear SVG inside a container ----
function clearAndCreateSvg(selector) {
    d3.select(selector).selectAll("*").remove();

    const svg = d3.select(selector)
        .append("svg")
        .attr("width", chartWidth + chartMargin.left + chartMargin.right)
        .attr("height", chartHeight + chartMargin.top + chartMargin.bottom);

    return svg.append("g")
        .attr("transform", `translate(${chartMargin.left},${chartMargin.top})`);
}

// Load CSV and start dashboard
d3.csv(DATA_PATH).then(rawData => {
    // Clean / convert numeric fields
    const data = rawData.map(d => ({
        id: d.id,
        title: d.title,
        type: d.type, // MOVIE / SHOW
        description: d.description,
        release_year: +d.release_year,
        age_certification: d.age_certification || "Unknown",
        runtime: +d.runtime,
        imdb_id: d.imdb_id,
        imdb_score: +d.imdb_score,
        imdb_votes: +d.imdb_votes
    })).filter(d =>
        !isNaN(d.imdb_score) &&
        !isNaN(d.release_year)
    );

    // Initialize filters
    initFilterControls(data);

    // Draw first view
    updateAll(data);

    // Hook up events
    document.getElementById("genreFilter").addEventListener("change", () => updateAll(data));
    document.getElementById("typeFilter").addEventListener("change", () => updateAll(data));
    document.getElementById("yearSlider").addEventListener("input", function () {
        document.getElementById("yearValue").textContent = this.value;
        updateAll(data);
    });
});

// ---------------- FILTERS ----------------

function initFilterControls(data) {
    // Age ratings (using age_certification like a genre)
    const set = new Set();
    data.forEach(d => set.add(d.age_certification || "Unknown"));

    const genreSelect = document.getElementById("genreFilter");
    set.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        genreSelect.appendChild(opt);
    });

    // Year slider min/max from data
    const years = data.map(d => d.release_year);
    const minYear = d3.min(years);
    const maxYear = d3.max(years);

    const slider = document.getElementById("yearSlider");
    slider.min = minYear;
    slider.max = maxYear;
    slider.value = minYear;

    document.getElementById("yearValue").textContent = minYear;
}

function applyFilters(data) {
    const genre = document.getElementById("genreFilter").value; // age_certification
    const type = document.getElementById("typeFilter").value;   // MOVIE / SHOW / All
    const yearMin = +document.getElementById("yearSlider").value;

    return data.filter(d =>
        (genre === "All" || d.age_certification === genre) &&
        (type === "All" || d.type === type) &&
        d.release_year >= yearMin
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

// ------------- 1) Rating histogram -------------

function drawRatingHistogram(data) {
    const container = "#ratingHistogram";
    const g = clearAndCreateSvg(container);

    const scores = data.map(d => d.imdb_score).filter(x => !isNaN(x));

    if (!scores.length) {
        d3.select(container)
            .append("p")
            .attr("class", "no-data-msg")
            .text("No data for selected filters.");
        return;
    }

    const x = d3.scaleLinear()
        .domain(d3.extent(scores))
        .nice()
        .range([0, chartWidth]);

    const bins = d3.bin()
        .domain(x.domain())
        .thresholds(15)(scores);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .nice()
        .range([chartHeight, 0]);

    // Bars
    g.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", d => x(d.x0) + 1)
        .attr("y", d => y(d.length))
        .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 2))
        .attr("height", d => chartHeight - y(d.length))
        .attr("fill", "#6366f1")
        .append("title")
        .text(d => `${d.x0.toFixed(1)}–${d.x1.toFixed(1)}: ${d.length} title(s)`);

    // X-axis
    g.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x));

    // Y-axis
    g.append("g").call(d3.axisLeft(y));

    // X-axis label
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 30)
        .attr("text-anchor", "middle")
        .attr("fill", "#ddd")
        .text("IMDb Rating");

    // Y-axis label
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", -chartHeight / 2)
        .attr("y", -35)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("fill", "#ddd")
        .text("Number of Titles");
}

// ------------- 2) Average rating by age_certification -------------

function drawGenreChart(data) {
    const container = "#genreBarChart";
    const g = clearAndCreateSvg(container);

    const grouped = d3.rollups(
        data,
        v => d3.mean(v, d => d.imdb_score),
        d => d.age_certification
    ).map(([age, avg]) => ({ age, avg }))
     .sort((a, b) => d3.ascending(a.avg, b.avg));

    if (!grouped.length) {
        d3.select(container)
            .append("p")
            .attr("class", "no-data-msg")
            .text("No data for selected filters.");
        return;
    }

    const y = d3.scaleBand()
        .domain(grouped.map(d => d.age))
        .range([chartHeight, 0])
        .padding(0.3);

    const x = d3.scaleLinear()
        .domain([0, d3.max(grouped, d => d.avg)])
        .nice()
        .range([0, chartWidth]);

    g.selectAll("rect")
        .data(grouped)
        .enter()
        .append("rect")
        .attr("y", d => y(d.age))
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("width", d => x(d.avg))
        .attr("fill", "#22c55e")
        .append("title")
        .text(d => `${d.age}: ${d.avg.toFixed(2)}`);

    g.append("g").call(d3.axisLeft(y));
    g.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x));
}

// ------------- 3) Timeline – avg rating by year -------------

function drawTimeline(data) {
    const container = "#timelineChart";
    const g = clearAndCreateSvg(container);

    const grouped = d3.rollups(
        data,
        v => d3.mean(v, d => d.imdb_score),
        d => d.release_year
    ).map(([year, avg]) => ({ year: +year, avg }))
     .sort((a, b) => d3.ascending(a.year, b.year));

    if (!grouped.length) {
        d3.select(container)
            .append("p")
            .attr("class", "no-data-msg")
            .text("No data for selected filters.");
        return;
    }

    const x = d3.scaleLinear()
        .domain(d3.extent(grouped, d => d.year))
        .range([0, chartWidth]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(grouped, d => d.avg)])
        .nice()
        .range([chartHeight, 0]);

    const area = d3.area()
        .x(d => x(d.year))
        .y0(chartHeight)
        .y1(d => y(d.avg));

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.avg));

    g.append("path")
        .datum(grouped)
        .attr("fill", "#111827")
        .attr("d", area);

    g.append("path")
        .datum(grouped)
        .attr("fill", "none")
        .attr("stroke", "#f97316")
        .attr("stroke-width", 2)
        .attr("d", line);

    g.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));

    g.append("g").call(d3.axisLeft(y));
}

// ------------- 4) Movies vs TV Shows (avg score) -------------

function drawTypeComparison(data) {
    const container = "#typeComparison";
    const g = clearAndCreateSvg(container);

    const grouped = d3.rollups(
        data,
        v => d3.mean(v, d => d.imdb_score),
        d => d.type
    ).map(([type, avg]) => ({ type, avg }));

    if (!grouped.length) {
        d3.select(container)
            .append("p")
            .attr("class", "no-data-msg")
            .text("No data for selected filters.");
        return;
    }

    const x = d3.scaleBand()
        .domain(grouped.map(d => d.type))
        .range([0, chartWidth])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(grouped, d => d.avg)])
        .nice()
        .range([chartHeight, 0]);

    g.selectAll("rect")
        .data(grouped)
        .enter()
        .append("rect")
        .attr("x", d => x(d.type))
        .attr("y", d => y(d.avg))
        .attr("width", x.bandwidth())
        .attr("height", d => chartHeight - y(d.avg))
        .attr("fill", "#e11d48")
        .append("title")
        .text(d => `${d.type}: ${d.avg.toFixed(2)}`);

    g.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x));

    g.append("g").call(d3.axisLeft(y));
}

// ------------- 5) Top 10 titles -------------

function drawTopCards(data) {
    const container = d3.select("#topCards");
    container.html("");

    if (!data.length) {
        container.append("p")
            .attr("class", "no-data-msg")
            .text("No data for selected filters.");
        return;
    }

    const sorted = data.slice().sort((a, b) => {
        if (b.imdb_score === a.imdb_score) {
            return (b.imdb_votes || 0) - (a.imdb_votes || 0);
        }
        return b.imdb_score - a.imdb_score;
    });

    const top10 = sorted.slice(0, 10);

    const cards = container.selectAll(".title-card")
        .data(top10)
        .enter()
        .append("div")
        .attr("class", "title-card")
        .on("click", (event, d) => {
            alert(
                `${d.title}\n\n` +
                `Type: ${d.type}\n` +
                `Year: ${d.release_year}\n` +
                `IMDb: ${d.imdb_score} (${d.imdb_votes} votes)\n\n` +
                `${d.description}`
            );
        });

    cards.append("div")
        .attr("class", "title-main")
        .text(d => d.title);

    cards.append("div")
        .attr("class", "title-meta")
        .text(d => `${d.type} • ${d.release_year} • IMDb ${d.imdb_score} (${d.imdb_votes} votes)`);

    cards.append("div")
        .attr("class", "title-desc")
        .text(d => (d.description || "").slice(0, 140) + "…");
}
