import * as d3 from "d3";
import { useRef, useEffect } from "react";

export function Graph(props: any) {
  const svgRef = useRef(null);
        // @ts-ignore
  let width = props.width,
        // @ts-ignore
      height = props.height,
        // @ts-ignore
      onSelectSong = props.onSelectSong;
  
  useEffect(() => {
    if (!svgRef.current) return;
    
  d3.csv("/subgraph.csv", function(d) {
    return {
      source: d.source,
      target: d.target,
      value: Number(d.value),
      s_artist: d.s_artist,
      t_artist: d.t_artist,
      s_tags: d.s_tags,
      t_tags: d.t_tags,
      s_attribute: d.s_attribute,
      t_attribute: d.t_attribute
    }
  }).then(function(data) {
  
    var links = data;
    let songSet = new Set();
    for (const link of data) {
      songSet.add(link.source);
      songSet.add(link.target);
    }
  
    const nodes: Record<string, any> = {}
    
    // compute the distinct nodes from the links.
    links.forEach(function(link) {
      link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
      link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
    });
  
    var force = d3.forceSimulation()
        .nodes(d3.values(nodes))
        .force("link", d3.forceLink(links).distance(150))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .force("charge", d3.forceManyBody().strength(-250))
        .alphaTarget(1)
        .on("tick", tick);

    const svg = d3.select(svgRef.current);
  
    // add the links

    var range1: any = [d3.rgb("#75A2BF"),d3.rgb("#003366")];
    var range2: any = d3.interpolateHcl;
    var path_colors = d3.scaleLinear()
        .domain([0,1])
        .range(range1)
        .interpolate(range2);

    var path = svg.append("g")
        .selectAll("path")
        .data(links)
        .enter()
        .append("line")
        .attr("class", function(d: any) { return "link " + d.artist; })
        .style("stroke", function(d: any) {return path_colors(d.value)})
        .style("stroke-width", 3);
  

    let tooltip = d3.select("#tooltip")
        .style("visibility", "visible")
        .style("border-width", "1px")
        .style("border-radius", "10px")
        .style("padding", "10px");
    // define the nodes
    var call: any = d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
    var node = svg.selectAll(".node")
        .data(force.nodes())
        .enter().append("g")
        .attr("class", "node")
        .classed("fixed", d => d.fx !== undefined)
        .call(call)
            .on("dblclick", drag_doubleclick)
            .on("mouseover", mouseover)
            .on("click", function(d: any) {
              // Check if this is a song node (has artist info)
              for (const item of data) {
                if (item.s_attribute == "song" && (item["source"]["name"] == d.name || item["target"]["name"] == d.name)) {
                  if (onSelectSong) {
                    onSelectSong(d.name);
                  }
                  return;
                }
              }
            });
  
    function mouseover(d: any) {
      let artist;
      let tags = "";
      let sim_score;
      for (const item of data) {
        if (item.s_attribute == "song" && item["source"]["name"] == d.name) {
          artist = item["s_artist"];
          let tags_list = JSON.parse(item["s_tags"].replace(/'/g, '"'));
          tags = tags_list.map((x) => {
            return x[0];
          }).toString();
          sim_score = item["value"];
        }
        if (item.s_attribute == "song" && item["target"]["name"] == d.name) {
          artist = item["t_artist"];
          let tags_list = JSON.parse(item["s_tags"].replace(/'/g, '"'));
          tags = tags_list.map((x) => {
            return x[0];
          }).toString();
          sim_score = item["value"];
        }
      }
      let display = artist != "N/A" ? `
        Name: ${d.name}<br>
        Artist: ${artist}<br>
        Tags: ${tags}<br>
        Similarity Score: ${sim_score}<br>
      ` : `This is an artist node! Part of what makes this a hyper graph.`
      tooltip
      .html(display)
    }

    // c2) The degree of each node should be represented by varying colors
    var min_degree=d3.min(data, function(d: any) {return d["value"]});
    var max_degree=d3.max(data, function(d: any) {return d["value"]});
    // var max_degree=d3.max(force.nodes(), function(d: any) { return d.weight = path.filter(function(l: any) {return l.source.index == d.index || l.target.index == d.index}).size();});
    var rang: any = [d3.rgb("#00000f"),d3.rgb("#fffff0")];
    var rang2: any = d3.interpolateHcl;
    var colors = d3.scaleLinear()
        .domain([min_degree,max_degree])
        .range(rang)
        .interpolate(rang2);
  
    // add the nodes
    var fill: any = d3.rgb("#bfd3e6");

    var gery_fill: any = d3.rgb("#808080");
    var red_fill: any = d3.rgb("#c43727");
    node.append("circle")
        .attr("id", function(d: any){return (d.name.replace(/\s+/g,'').toLowerCase());})
        .attr("r", function(d: any) { d.weight = path.filter(function(l: any) {return l.source.index == d.index || l.target.index == d.index}).size(); var minRadius =3;
       return minRadius + (d.weight * 2);}) //c1) 
      .style("fill", (d: any) => {
        for (const item of links) {
          if (item.source["name"] == d.name && item.s_attribute == "artist") {
            return red_fill;
          }
        }
        return gery_fill;
      })
      .on("dblclick", function(d) {
        d3.select(this).style("fill", fill);}); //d3.2
  
  
    //a) Adding node labels:  Modify  submission.html  to show  the  node label  (the node name, e.g., the source)  at the  top  right  of each node in  bold. If  a node is  dragged, its  label  must move with it. 
    node.append("text")
    .attr("x", function(d) { return (d.index) +7; })
    .attr("y", "0.35em")
    .text(function(d: any){return (d.name)});   
  
  
    // add the curvy lines
    function tick() {
        path
        // @ts-ignore
        .attr("x1", d => d.source.x)
        // @ts-ignore
        .attr("y1", d => d.source.y)
        // @ts-ignore
        .attr("x2", d => d.target.x)
        // @ts-ignore
        .attr("y2", d => d.target.y);
  
        node.attr("transform", function(d) {
            return "translate(" + validate_width(d.x)  + "," + validate_height(d.y) + ")"; 
        });

        node.each((d: any) => {
          if (d.weight > 20) {
            d.fx = validate_width(d.x);
            d.fy = validate_height(d.y);
          }
        });

    };
  
    function dragstarted(d: any) {
        if (!d3.event.active) force.alphaTarget(0.3).restart();
        d.fx = validate_width(d.x);
        d.fy = validate_height(d.y);
    };
  
    function dragged(d: any) {
        d.fx = validate_width(d3.event.x);
        d.fy = validate_height(d3.event.y);
    };
  
    function dragended(d: any) {
        if (!d3.event.active) force.alphaTarget(0);
        d.fixed=true;
        if (d.fixed == true) {
            d.fx = validate_width(d.x);
            d.fy = validate_height(d.y);
        }
        else {
            d.fx = null;
            d.fy = null;
        }
        // @ts-ignore
    };
  
    function drag_doubleclick(d: any) {
        if (!d3.event.active) force.alphaTarget(0);
        d.fixed=false;
        if (d.fixed == true) {
            d.fx = validate_width(d.x);
            d.fy = validate_height(d.y);
        }
        else {
            d.fx = null;
            d.fy = null;
        }
        };

    function validate_height(x: any) {
      if (x < 0) x = 0 + 10;
      if (x > height) x = height - 10;
      return x;
    }

    function validate_width(x: any) {
      if (x < 0) x = 0 + 10;
      if (x > width) x = width - 10;
      return x;
    }

    // Define responsive behavior
    function resize() {
      width = parseInt(d3.select("#graph").style("width"));
      height = parseInt(d3.select("#graph").style("height"));
      svg.attr("width", width).attr("height", height); 
    };

    // Call the resize function whenever a resize event occurs
    d3.select(window).on('resize', resize);

    // Call the resize function
    resize();


  }).catch(function(error) {
    console.log(error);
  });
  }, [svgRef, onSelectSong, width, height]);
  
  return (
    <svg ref={svgRef} width={width} height={height} className="border-solid border-1 border-sky-500 col-span-3"/>
  );
}