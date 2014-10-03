var matrix = [];
var addresses = [];

var fill = d3.scale.ordinal()
    .domain(d3.range(10))
    .range(["#DCAB56", "#FFDD89", "#957244", "#F26223", "#99B2B7", "#41617F", "#B22903", "#704930", "#9E4689", "#A1B172"]);

function draw() {

    var radius = Math.min($(window).width(), $(window).height()) - 40;

    var width = radius,
        height = radius,
        outerRadius = Math.min(width, height) / 2 - 10,
        innerRadius = outerRadius - 24;

    var formatPercent = d3.format(".1%");

    var arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    var layout = d3.layout.chord()
        .padding(.04)
        .sortSubgroups(d3.descending)
        .sortChords(d3.ascending);

    var path = d3.svg.chord()
        .radius(innerRadius);

    $("#chart").empty();

    var svg = d3.select("#chart").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("id", "circle")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    svg.append("circle")
        .attr("r", outerRadius);

    // Compute the chord layout.
    layout.matrix(matrix);

    // Add a group per neighborhood.
    var group = svg.selectAll(".group")
        .data(layout.groups)
        .enter().append("g")
        .attr("class", "group")
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);

    // Add a mouseover title.
    group.append("title").text(function(d, i) {
        return addresses[i];
    });

    // Add the group arc.
    var groupPath = group.append("path")
        .attr("id", function(d, i) { return "group" + i; })
        .attr("d", arc)
        .style("fill", function(d) { return fill(d.index); })
        .style("stroke", function(d) { return '#333333'; })

    // Add a text label.
    var groupText = group.append("text")
        .attr("x", 6)
        .attr("dy", 15);

    groupText.append("textPath")
        .attr("font-size", "10px")
        .attr("xlink:href", function(d, i) { return "#group" + i; })
        .text(function(d, i) { return addresses[i]; });

    // Remove the labels that don't fit. :(
    groupText.filter(function(d, i) { return groupPath[0][i].getTotalLength() / 2 - 16 < this.getComputedTextLength(); })
        .remove();

    // Add the chords.
    var chord = svg.selectAll(".chord")
        .data(layout.chords)
        .enter().append("path")
        .attr("class", "chord")
        .style("fill", function(d) { return fill(d.source.index); })
        .style("stroke", function(d) { return '#333333'; })
        .attr("d", path).style("opacity", 0.75);

    // Add an elaborate mouseover title for each chod.
    chord.append("title").text(function(d) {
        return addresses[d.source.index];
    });

    function mouseover(d, i) {
        chord.classed("fade", function(p) {
            return p.source.index != i
                && p.target.index != i;
        });
    }


    function mouseout(d, i) {
        chord.classed("fade", function(p) {
            return false;
        });
    }
}

$(window).resize(function() {
    draw();
});

$(document).ready(function() {
    var data_obj = $(document.body).data('json');

    for (var i in data_obj.matrix) {
        var matrix_obj = data_obj.matrix[i];

        matrix.push(matrix_obj.taints);

        addresses.push(matrix_obj.address);
    }

    draw();
});
