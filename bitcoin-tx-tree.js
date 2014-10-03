
function init() {
    $('#chart').empty();

}

$(document).ready(function() {

    $('#iphone').mouseenter(function() {
        $(this).animate({ bottom: -10 }, 400);
    });

    $('#iphone').mouseleave(function() {
        $(this).animate({ bottom: -110 }, 400);
    });

    //Map of bitcoin address to node and
    var nodeMap = [];

    var w = 250,
        h = 500,
        i = 0,
        duration = 500,
        root;

    var depth ;
    var nodeCount;

    var chart = $('#chart');

    var tree = d3.layout.tree().size([h, w]);

    var diagonal = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });

    var vis;

    var getRoot = function() {

        chart.empty();
        nodeCount = 0;
        depth = 1;

        vis = d3.select("#chart").append("svg:g").attr("transform", "translate(50, 0)");

        d3.json('/tree/' + $(document.body).data('txindex') + '?format=json', function(json) {
            nodeCount = json.children.length;

            nodeMap[json.name] = json;

            for (var i =0; i < json.children.length; ++i) {
                var child = json.children[i];

                child.children = [];

                nodeMap[child.name] = child;
            }

            update(root = json);
        });
    };

    getRoot();

    var radius = function(d) {
        return Math.min(40, Math.max(20 * (d.value / root.value), 5.0));
    }

    $('#cluster').change(function() {
        getRoot();
    });

    function update(source) {

        //Increase the width when the depth increases
        chart.width((250*depth)+w);
        chart.height(Math.max(window.innerHeight-150, h+(nodeCount*40)));

        // Compute the new tree layout.
        var nodes = d3.layout.tree().size([chart.height(), chart.width()-160]).nodes(root).reverse();

        // Update the nodes…
        var node = vis.selectAll("g.node").data(nodes, function(d) { return d.id || (d.id = ++i); });

        var nodeEnter = node.enter().append("svg:g").attr("class", "node").attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; });

        var func = function(nodeEnter) {
            nodeEnter.append("svg:circle")
                .attr("r", function(d) {
                    return radius(d);
                }).style("fill", function(d) { return (d.redeemed_tx == null || d.redeemed_tx.length == 0) ? "lightsteelblue" : "#fff"; }).on("click", function(d) {
                    click(d, nodeEnter);
                });

            //Bitcoin Address
            nodeEnter.append("svg:text").attr("x", function(d) {
                if (d.name == null) return 0;

                return -(3 * d.name.length);
            }).attr("y", function (d) {
                    return 13 + radius(d);
                }).text(function(d) {
                    return d.name;
                }).on("click", function(d) {
                    click(d, nodeEnter);
                });

        }(nodeEnter);

        //Value in BTC
        nodeEnter.append("svg:text").attr("x", function(d) {
            return radius(d) + 6;
        }).attr("y", function (d) {
                return 4;
            }).text(function(d) {
                return d.value + ' BTC';
            }).attr("class", "value");

        // Transition nodes to their new position.
        nodeEnter.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            }).style("opacity", 1).select("circle").style("fill", function(d) {
                if (d.redeemed_tx > 0) {
                    return "orange";
                } else {
                    return "lightsteelblue";
                }
            });

        node.transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
            .style("opacity", 1);

        node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + source.y + "," + (source.x + 500) + ")"; })
            .style("opacity", 1e-6)
            .remove();


        // Update the links…
        var link = vis.selectAll("path.link")
            .data(tree.links(nodes), function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("svg:path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
            })
            .transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);


        node.selectAll("circle").style("fill", function(d) {
            if (d.redeemed_tx == null || d.redeemed_tx.length == 0) {
                if (d.children == null || d.children.length == 0 && d.spent == null) {
                    return "lightsteelblue";
                } else {
                    return "lightgray";
                }
            } else {
                return "orange";
            }

        }).attr("r", function(d) {
                return radius(d);
            });

        node.selectAll(".value").text(function(d) {
            return d.value + ' BTC';
        });

    }

    var recursive = function(node, func) {
        func(node);

        if (node.children == null)
            return;

        for (var i = 0; i < node.children.length; ++i) {
            recursive(node.children[i], func);
        };
    }


    // Toggle children on click.
    function click(node, nodeEnter) {
        if (node.redeemed_tx == null || node.redeemed_tx.length == 0) {
            update(node);
            return;
        }

        var tmp = node.redeemed_tx;

        node.redeemed_tx = [];

        for (var ti = 0; ti < tmp.length; ++ti) {

            d3.json('/tree/' + tmp[ti] + '?format=json', function(json) {

                if (node.rendered == null) {
                    node.relayed_by = json.relayed_by;
                    node.relayed_flag = json.relayed_flag;

                    //Flag image
                    nodeEnter.append("svg:image").attr("xlink:href", function(d) {
                        return d.relayed_flag;
                    }).attr("y", -7).attr("x", -7).attr('width', 16).attr('height', 16).on("click", function(d) {
                            click(d, nodeEnter);
                        });

                    //IP Address label
                    nodeEnter.append("svg:text").attr("x", function(d) {
                        if (d.relayed_by != null)
                            return -(2.2 * d.relayed_by.length);
                        else
                            return 0;
                    }).attr("y", function (d) {
                            return 27 + radius(d);
                        }).text(function(d) {
                            return d.relayed_by;
                        });

                    if (node.depth == depth)
                        ++depth;

                    node.rendered = true;
                }

                if ($('#cluster').val() == 'address') {
                    //Update the node map
                    for (var i =0; i < json.children.length; ++i) {
                        var child = json.children[i];

                        child.children = [];

                        var existing = nodeMap[child.name];

                        if (existing == null) {
                            nodeMap[child.name] = child;
                            node.children.push(child);
                            ++nodeCount;
                        } else {
                            child.spent = true;

                            existing.value += child.value;

                            existing.redeemed_tx.push(child.redeemed_tx);
                        }
                    }
                } else {
                    node.children = json.children;
                    nodeCount += node.children.length;
                }

                update(node);
            });
        }
    }
});

