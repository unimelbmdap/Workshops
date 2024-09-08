/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */
function bubbleChart() {
  // Constants for sizing
  var width = 940;
  var height = 800;

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('gates_tooltip', 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 2, y: (height / 2) };
  var outside = {x: width*2,y: height*2};
  // distance to shift the centre x pos to focus on a particular category 
  var shiftXPos = 0;
/*
  var catCenters = {
    'cat0': { x: width / 6, y: height/2 },
    'cat1': { x: 2*width / 6, y: height/2 },
    'cat2': { x: 3* width / 6, y: height/2 },
    'cat3': { x:  4* width / 6, y:  height/2 },
    'cat4': { x: 5 * width / 6, y: height/2 }
  };
  */
  var catCenters = {
    'cat0': { x: 20 / 6, y: height/2 },
    'cat1': { x: 185, y: height/2 },
    'cat2': { x: 325, y: height/2 },
    'cat3': { x:  525, y:  height/2 },
    'cat4': { x: 725, y: height/2 }
  };
  
  // these are customised for the aussie lexicon
  // X locations of the category titles.
  // catid and its label are linked in the csv eg 'cat0' is always 'administration'
    var catTitles = {
      'cat0': {x: 20, label: "Administration"},
      'cat1': {x: 185, label: "Assessment"},
      'cat2': {x: 325, label: "Classroom Management" },
      'cat3': {x: 525, label: "Learning Strategies"},
      'cat4': {x: 725, label: "Teaching Strategies"}
    };


  // @v4 strength to apply to the position forces
  var forceStrength = 0.01;

  // These will be set in create_nodes and create_vis
  var svg = null;
  var bubbles = null;
  var nodes = [];
  var grouped = [];


      // Tree configuration - changing these parameters will change the look and feel of the tree
      var branches = [];
      branches = [];
      // Have a go at changling l: length to 80 and see what happens
      var seed = {i: 0, x: width/2, y: height, a: 0, l: 130, d:0}; // a = angle, l = length, d = depth
      var da = 0.32; // Angle delta
      var dl = 0.875; // Length delta (factor)
      var ar = 0.2; // Randomness
      var maxDepth =7;

  // Charge function that is called for each node.
  // As part of the ManyBody force.
  // This is what creates the repulsion between nodes.
  //
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  //
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  //
  // Charge is negative because we want nodes to repel.
  // @v4 Before the charge was a stand-alone attribute
  //  of the force layout. Now we can use it as a separate force!
  function charge(d) {
   // return -Math.pow(d.radius, 1.8) * forceStrength;
      return -Math.pow(60, 1.8) * forceStrength;
  }

  // Here we create a force layout and
  // @v4 We create a force simulation now and
  //  add forces to it.
  var simulation = d3.forceSimulation()
    .velocityDecay(0.2)
    .force('x', d3.forceX().strength(forceStrength*1.25).x(center.x))
    .force('y', d3.forceY().strength(forceStrength).y(center.y))
    .force('charge', d3.forceManyBody().strength(charge))
    .on('tick', ticked);

  // @v4 Force starts up automatically,
  //  which we don't want as there aren't any nodes yet.
  simulation.stop();

  // Colours from brewer palette qualitative categorical data
  // @v4 scales now have a flattened naming scheme
  var fillColor = d3.scaleOrdinal()
    .domain(['cat0', 'cat1', 'cat2' ,'cat3','cat4','cat5'])
    .range(['#66c2a5', '#fc8d62','#e78ac3', '#a6d854','#ffd92f','#ffff99']);


  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   * Each node will store data and visualization values to visualize
   * a bubble.
   *
   * rawData is expected to be an array of data objects, read in from
   * one of d3's loading functions like d3.csv.
   *
   * This function returns the new node array, with a node in that
   * array for each element in the rawData input.
   */
  function createNodes(rawData) {
    // Use the max amount in the data as the max in the scale's domain
    // note we have to ensure the amount is a number. 
    var maxAmount = d3.max(rawData, function (d) { return +d.amount; });

    // Sizes bubbles based on area.
    // @v4: new flattened scale names.
    var radiusScale = d3.scalePow()
      .exponent(0.5)
      .range([2, 85])
      .domain([0, maxAmount]);
   //   .domain([0, 10]);

    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
    var myNodes = rawData.map(function (d) {
      return {
        id: d.id,
        term: d.term,
        alt: d.alt,
        descr: d.descr,
        egs: d.egs,
        cat: d.cat,
        radius: radiusScale(+d.amount),
        value: +d.amount,
        catdescr: d.catdescr,
        dup: d.dup,
        x: initialX(d.dup),
        y: initialY(d.dup)
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    //myNodes.sort(function (a, b) { return b.value - a.value; });

    return myNodes;
  }

// put the duplicates in the lower middle of the bubbles to give a tree like shapes to the originals (non-dups)
  function initialX(isDup){
    if (isDup=="False"){
      return Math.random() * 900;
    }
    else {
      //  return width/2;
        return 450;
    };
    
  };

  function initialY(isDup){

    if (isDup=="False"){
      return Math.random() * 800;
    }
    else {
       // return height/15;
        return 400;
    };
  };



  /*
   * Main entry point to the bubble chart. This function is returned
   * by the parent closure. It prepares the rawData for visualization
   * and adds an svg element to the provided selector and starts the
   * visualization creation process.
   *
   * selector is expected to be a DOM element or CSS selector that
   * points to the parent element of the bubble chart. Inside this
   * element, the code will add the SVG continer for the visualization.
   *
   * rawData is expected to be an array of data objects as provided by
   * a d3 loading function like d3.csv.
   */
  var chart = function chart(selector, rawData) {


    // convert raw data into nodes data
    nodes = createNodes(rawData);

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select(selector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);


    drawTree(svg);

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
      .data(nodes, function (d) { return d.id; })

    var bubblesE = bubbles.enter()
        .append('g')
        .attr("transform", d => `translate(${d.x}, ${d.y})`)
        .attr('class','bubble')
        .on('mouseover', showDetail)
        .on('mouseout', hideDetail);


    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    // @v4 Selections are immutable, so lets capture the
    //  enter selection to apply our transtition to below.
    // adapted with code from https://stackoverflow.com/questions/44339929/put-text-in-the-middle-of-a-circle-using-d3-js?answertab=votes#tab-top

    bubblesE.append('ellipse')
      .attr('id','termbubble')
      .attr('rx', 0)
      .attr('ry',0)
      .attr('fill', function (d) { return fillColor(d.cat); })
      .attr('stroke', function (d) { return d3.rgb(fillColor(d.cat)).darker(); })
      .attr('stroke-width', 2)
      .attr('class','termcircle')
      .attr('opacity',0);
    //  .attr('x',function (d) {if (d.dup=='False') {return Math.random() * 900 } else {return 0}}))
   //  .attr('y',function (d) {if (d.dup=='False') {return Math.random() * 800 } else {return 0}}));


   
    bubblesE.append("text")
        .attr('id','termtext')
        .attr('text-anchor', 'middle')
        .style("pointer-events", "none")
        .attr('class','termlabel')
        .attr('x',0)
        .attr('y',-5)
        .attr('dy',0)
        .attr('opacity',0)      
        .text(function(d) {
          return d.term;
        })
        .call(wrap, 55);

    // @v4 Merge the original empty selection and the enter selection
    bubbles = bubbles.merge(bubblesE);


    // Set the simulation's nodes to our newly created nodes array.
    // @v4 Once we set the nodes, the simulation will start running automatically!
    simulation.nodes(nodes);

    // Set initial layout to single group.
    // set initial delay to allow time to draw tree
    delay = 1500;
    groupBubbles(delay);

  };


  /*
   * Callback function that is called after every tick of the
   * force simulation.
   * Here we do the acutal repositioning of the SVG circles
   * based on the current x and y values of their bound node data.
   * These x and y values are modified by the force simulation.
   */
  function ticked() {
  
     bubbles
      .attr("transform", d => `translate(${d.x}, ${d.y})`);
  }

 

  /*
   * Sets visualization in "single group mode".
   * The year labels are hidden and the force layout
   * tick function is set to move all nodes to the
   * center of the visualization.
   */
  function groupBubbles(delayTime) {

    hideCatTitles();

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    d3.selectAll("#termbubble")
      .attr('rx',0)
      .attr('ry',0)
      .attr('fill', function (d) { return fillColor('cat5'); })
      .attr('stroke', function (d) { return d3.rgb(fillColor('cat5')).darker(); })
      .attr('opacity',function (d) {if (d.dup=='False') {return 1 } else {return 0}})
      .transition()
      .delay(delayTime)
      .duration((3000))
      .attr('rx',function (d) {if (d.dup=='False') {return 45 } else {return 0}})
      .attr('ry',function (d) {if (d.dup=='False') {return 35  } else {return 0}});
    d3.selectAll("#termtext")
      .attr('opacity',0)
      .transition()
      .delay(delayTime+1000)
      .duration(2000)
      .attr('opacity',function (d) {if (d.dup=='False') {return 1} else {return 0}});


    // @v4 Reset the 'x' force to draw the bubbles to the center.
    simulation.force('x', d3.forceX().strength(forceStrength*.6).x(center.x));
    simulation.force('y', d3.forceY().strength(forceStrength*1.1).y(center.y-130));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }


  /*
   * Sets visualization in "split by category mode".
   * The category labels are shown and the force layout
   * tick function is set to move nodes to the
   * catCenter of their data's category.
   */
  function splitBubbles() {

    showCatTitles();
    hideTree();

    d3.selectAll("#termbubble")
      .attr('fill', function (d) { return fillColor(d.cat); })
      .attr('stroke', function (d) { return d3.rgb(fillColor(d.cat)).darker(); })
      .attr('opacity',1)
      .attr('rx',45)
      .attr('ry',35);

    d3.selectAll("#termtext")
      .attr('opacity',1);


    // @v4 Reset the 'x' force to draw the bubbles to their category centered centres 
    // (y is a bit lower to leave room for cat titles)
   // simulation.force('x', d3.forceX().strength(forceStrength).x(nodeCentrePosX(center.x)));
    simulation.force('x', d3.forceX().strength(forceStrength*.7).x(center.x));
    simulation.force('y', d3.forceY().strength(forceStrength).y(center.y));


    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(5).restart();


  }




  /*
   * Hides Category label displays.
   */
  function hideCatTitles() {
    svg.selectAll('.cat').remove();
    svg.selectAll('.outline').remove();
  }

 

 /*
   * Shows Category label displays.
   */
  function showCatTitles() {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var catsData = d3.keys(catTitles);
    var cats = svg.selectAll('.cat')
      .data(catsData);


      cats.enter().append('rect')
        .attr('class', 'outline')
        .attr('x', function (d) { return catTitles[d].x-20; })
        .attr('y', 10 )
        .attr('width',function (d) { return catTitles[d].label.length*7+40; })
        .attr('height',30)
        .attr('rx',5)
        .attr('fill','white')
        .attr('stroke', function (d) { return d3.rgb(fillColor(d)); })
        .attr('stroke-width',3);

      cats.enter().append('text')
          .attr('class', 'cat')
          .attr('x', function (d) { return catTitles[d].x; })
          .attr('y', 30 )
          .attr('text-anchor', 'right')
          .text(function (d) { return catTitles[d].label; })
          .on('mouseover', filterCats)
          .on('mouseout', showAllCats);

  }

 /*
   * Provides a x value for each node to be used with the split by category
   * x force.
   */
  function nodeCentrePosX(d) {
    return catCenters[d.cat].x+shiftXPos;
  } 
  
  function nodeCentrePosY(d) {
    return catCenters[d.cat].y;
  }


  function filterCats(d){
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'black');

    // shift the centre to the selected category 
    shiftXPos = center.x-catCenters[d].x;

    // @v4 Reset the 'x' force to draw the current category into the centre and leave more space between bubbles
    simulation.force('x', d3.forceX().strength(forceStrength*.75).x(nodeCentrePosX));
    simulation.force('y', d3.forceY().strength(forceStrength).y(nodeCentrePosY));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(5).restart();
  }

  function showAllCats(d){
    // reset outline
    d3.select(this).attr('stroke', 'dark gray');

    // @v4 Reset the 'x' force to draw the bubbles to the center.
    simulation.force('x', d3.forceX().strength(forceStrength*.7).x(center.x));
    simulation.force('y', d3.forceY().strength(forceStrength).y(center.y));


    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }

  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   * This is where you could add more fields for your data
   */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'black');

    var content = '<span class="word">' +
                  d.term.toLowerCase() +
                  '</span>&nbsp&nbsp' +
                  '<span class="value">' +
                  d.descr.toLowerCase() +
                  '</span><br/><br/>' +
                  '<span class="egs">' +
                  d.egs +
                  '</span><br/><br/>' +
                  '<span class="title">' +
                  d.catdescr +
                  '</span>';

    tooltip.showTooltip(content, d3.event);
  }

  /*
   * Hides tooltip
   */
  function hideDetail(d) {
    // reset outline
    d3.select(this)
      .attr('stroke', 'dark gray');

    tooltip.hideTooltip();
  }


// Tree creation functions
function branch(b) {
	var end = endPt(b), daR, newB;

	branches.push(b);

	if (b.d === maxDepth)
		return;

	// Left branch
	daR = ar * Math.random() - ar * 0.5;
	newB = {
		i: branches.length,
		x: end.x,
		y: end.y,
		a: b.a - da + daR,
		l: b.l * dl,
		d: b.d + 1,
		parent: b.i
	};
	branch(newB);

	// Right branch
	daR = ar * Math.random() - ar * 0.5;
	newB = {
		i: branches.length,
		x: end.x, 
		y: end.y, 
		a: b.a + da + daR, 
		l: b.l * dl, 
		d: b.d + 1,
		parent: b.i
	};
	branch(newB);
}

  function endPt(b) {
    // Return endpoint of branch   (grow a little taller *1.1)
    var x = b.x + b.l * Math.sin( b.a );
    var y = b.y - b.l * Math.cos( b.a )*1.1;
    return {x: x, y: y};
  }

  function hideTree(){
    svg.selectAll('.line').remove();
  }

  function drawTree(svg){
    // based on code by Peter Cook (@prcweb)

	  branch(seed);

    // D3 functions
    function x1(d) {return d.x;}
    function y1(d) {return d.y;}
    function x2(d) {return endPt(d).x;}
    function y2(d) {return endPt(d).y;}

  /*  svg = d3.select('svg')
          .attr('width', width)
          .attr('height', height);
*/

    svg.selectAll('line')
            .data(branches)
            .enter()
            .append('line')
              .attr('x1', x1)
              .attr('y1', y1)
              .attr('x2', x1)
              .attr('y2', y1)
              .attr('stroke','#6D6E70')
              .attr('fill','#6D6E70')
              .attr('id', function(d) {return 'id-'+d.i;})
              .attr('opacity',0)
            .transition()
              .delay(function(d) { return d.d * 400; })
              .duration(900)
              .attr('x1', x1)
              .attr('y1', y1)
              .attr('x2', x2)
              .attr('y2', y2)
              .attr('opacity',1)
              .style('stroke-width', function(d) {return parseInt((maxDepth + 1 - d.d)*1.5) + 'px';})
              .attr('class','line');

         /*   //added leaves but they're hideous - leaving code in case
     svg.selectAll('ellipse')
            .data(branches)
            .enter()
            .append('ellipse')
            .filter(function(d) { return d.d > maxDepth-3;})
                .attr('cx',x2)
                .attr('cy',y2)
                .attr('rx', 5)
                .attr('ry',20)
                .attr('fill', '#708238')
          //      .attr('stroke', 'dark green')
                .attr('stroke-width', 2)
                .attr('class','leaf')
                .attr('opacity',1);
              //  */

  }

  /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single group" and "split by category" modes.
   *
   * displayName is expected to be a string and either 'categories' or 'all'.
   */
  chart.toggleDisplay = function (displayName) {
    if (displayName === 'categories') {
      // drop filter ie show all bubbles
      splitBubbles();
    } else {
      // filter out duplicates for grouped bubbles

      // show grouped all bubbles without delay (ie don't draw tree)
      delay = 0;
      groupBubbles(delay);
    }
  };

  // return the chart function from closure.
  return chart;
}

/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }

  myBubbleChart('#vis', data);
}


/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select('#toolbar')
    .selectAll('.button')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('.button').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var buttonId = button.attr('id');

      // Toggle the bubble chart based on
      // the currently clicked button.
      myBubbleChart.toggleDisplay(buttonId);
    });
}

/*
 * Helper function to convert a string into camel case
 * improve presentation.
 */
function toTitleCase(str) {
  return str.replace(
      /\w\S*/g,
      function(txt) {
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
  );
}


function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = .9, // ems
        y = text.attr("y"),
        x = text.attr("x"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}

function type(d) {
  d.value = +d.value;
  return d;
}

// Load the data.
d3.csv('data/ausdata2.csv', display);


// setup the buttons.
setupButtons();

