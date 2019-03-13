/**
 * Paul May , 1/4/2019
 * 
 * Animation manager for Mercatoria.
 * 
 * Please minify me before launching this 
 * site.
 */

// convenience function for generating spring representation of rate
function inverseRate(rate) {
  var minutesPerDay = 60 * 24; // helpful constant

  var minuteInverse = Math.floor(1 / rate * minutesPerDay); // average number of minutes between two transactions  

  return minuteInverse + " minutes";
}

class metaManager{
  //a manager for the managers.
  constructor(){
    this.managers = [];
    this.lex = null;
    this.debAdjust = this.adjustAll;
  }


  adjustAll(value){

    var temp = document.getElementsByClassName('slider');

    for(var i = 0;i<temp.length;i++){
      temp[i].value = value;
    }

    this.managers.forEach(element => {element.set(value);});

    this.lex.set(value);

    var txRates = document.getElementsByClassName('txn_rate');

    for(var i=0; i<txRates.length;i++){
      txRates[i].innerText = inverseRate(value);
    };

  }

}

class animManager{



  /**
   * A selector string
   * @param {String} divSelector
   * coordinates for the center of the map and flood origin
   * @param {[Int,Int]} coords
   * initial zoom for the map
   * @param {Int} zoom
   * The rate of the particular network
   * @param {Int} rate 
   * Path for the population and geo shape data
   * @param {String} jsonPath
   */

  constructor(divSelector,coords,zoom,rate,jsonPath){

    this.coords = coords;             //start lat lng
    this.zoom = zoom;                 //zoom level of the map
    this.supportedPop = (rate*86400); //starting supported pop
    this.divSelector = divSelector;   //div selection suffix
    this.rate = rate;                 //rate of transaction
    this.prevVal = 0;                 //previous value of the slider, optimization reasons
    this.priorityList = null;         //a distance ordered set of features on the map.

    document.getElementById(this.divSelector+"_pop").innerText = 
      Math.ceil(this.supportedPop).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');

    //set later during init()
    this.MapObj = null; 
    this.g = null;
    this.svg = null;
    this.jsonPath = jsonPath; //geojson

  }

  init(){
    this.appendMap();
    var co = [this.coords[1],this.coords[0]];

    d3.json(this.jsonPath,(err,data)=>{

      if(err) throw err;
      var list = data.features;

      //sort shape centroids by distance from the origin coords
      list.sort((a,b)=>{
        var num = 
          (d3.geoDistance(d3.geoCentroid(a),co) 
            - d3.geoDistance(d3.geoCentroid(b),co));
        return num;
      });


      var aggregator = 0;
      data.features.forEach((x)=>{
        if(this.divSelector=="eos_anim"){x.properties.population *= 1.2;}
        aggregator += (x.properties.population)?x.properties.population:0;
      });

      data.features = list;
      this.priorityList = data;
      manager.planetPop = aggregator;

      this.prevVal = 0;
      var currentPop = (this.rate*86400)/24;

      //print population
      document.getElementById(this.divSelector+"_pop").innerText = 
        Math.ceil(currentPop).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');


      // source: Mike Bostock 
      var scopeMap = this.MapObj;           
      function projectPoint(x, y) {
        var point = scopeMap.latLngToLayerPoint(new L.LatLng(y, x));
        this.stream.point(point.x, point.y);
      } 

      // ridiculous process for generating 
      // an svg path, this adds all list features 
      // the map at once
      var transform = d3.geoTransform({point: projectPoint});
      var geoGenerator = d3.geoPath().projection(transform);

      var feature = this.g.selectAll("path")
        .data(this.priorityList.features) 
        .enter().append("path");

      feature.attr("d", geoGenerator)
        .style("fill-opacity", 0.3)
        .attr('fill','red');

      var bounds = geoGenerator.bounds(this.priorityList);

      var topLeft = bounds[0], bottomRight = bounds[1];

      this.svg.attr("width", bottomRight[0] - topLeft[0])
        .attr("height", bottomRight[1] - topLeft[1])
        .style("left", topLeft[0] + "px")
        .style("top", topLeft[1] + "px");

      this.g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");               
      this.set(24);

    });


  }

  appendMap(){
    var bounds = new L.LatLngBounds(new L.LatLng(-90, -220), new L.LatLng(90, 220))
    this.MapObj = L.map(this.divSelector, 
      {zoomControl:false,
        scrollWheelZoom:false,
        dragging:(this.zoom <= 2),    
        touchZoom:(this.zoom <= 2),
        doubleClickZoom:false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        maxBoundsViscosity: Infinity,
        center: bounds.center,
        maxBounds: bounds,
      })
      .setView([this.coords[0],this.coords[1]], this.zoom);

    this.svg = d3.select(this.MapObj.getPanes().overlayPane).append("svg");
    this.g = this.svg.append("g").attr("class", "leaflet-zoom-hide");

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 16,
      minNativeZoom: 0,
      minZoom: 1.5,
      zoomSnap: 0,
      zoomControl:(this.zoom == 2),   
      noWrap: false,
    }).addTo(this.MapObj);

  }

  set(value){

    if(this.prevVal == value){ //avoids profligate calc
      return;
    }

    this.prevVal = value;
    var currentPop = (this.rate*86400)/value;
    var aggregator = 0;

    this.g.selectAll('path').each((d,i,p)=>{
      aggregator +=(d.properties.population)?d.properties.population:0;
      p[i].style["fill-opacity"] = ((aggregator>currentPop)&&(i!=0))?0:0.3;
    });

    document.getElementById(this.divSelector+"_pop").innerText = 
      Math.ceil(currentPop).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
  }

}

class LexManager{
  /**
   * the ID of the lex anim div
   * @param {String} divSelector 
   */
  constructor(divSelector){

    this.divSelector = divSelector;
    this.json = "/json/scale/globe.json";
    this.width = document.getElementById(divSelector).offsetWidth;
    this.height = document.getElementById(divSelector).offsetHeight;
    this.svg = null;
    this.currentCols = 1;
    this.currentRows = 1;
    this.supportedPop = 0;

  }

  init(){

    this.rate = 53600000

    this.supportedPop = (864000*this.rate)/24;

    this.supportedPlanets = (this.supportedPop/6528361110.699998).toFixed(2);

    this.maxPop = this.supportedPlanets;

    this.svg = d3.select("#"+this.divSelector)
      .append("svg")
      .attr("width",this.width)
      .attr("height",this.height);

    this.svg.append('text')
      .attr("id","svgText")
      .attr("x",(this.width/2) - 50)
      .attr("y",this.height + 50);

    d3.select("#svgText").text(this.supportedPlanets);
    document.getElementById(this.divSelector+"_pop").innerText = 
      Math.ceil(this.supportedPop).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');

    for(var i =0; i < this.maxPop; i++){
      this.svg.append("image")
        .attr("id","img_"+i)
        .attr("xlink:href", "/images/scale/world.svg");
    }

    this.calcLayout();

    var obj = this;
    window.onresize = ()=>{obj.redraw()};
    this.redraw();
  }   


  calcLayout(){

    // this is ugly and not time efficient 
    // but was the most explicit way to greedily
    // choose a colunm row layout that maximizes radius
    var rows = 1;
    var cols = 1;
    var floorPlan = Math.floor(this.supportedPlanets);
    for(;(floorPlan > rows*cols);){
      var rowAdded = (this.height/rows+1);
      var colAdded = (this.width/cols+1);

      if(rowAdded>colAdded){
        rows++;
      }else{
        cols++;
      }

    }
    this.rows = rows;
    this.cols = cols;
  }

  redraw(){

    this.calcLayout();

    this.width = document.getElementById(this.divSelector).offsetWidth;
    this.height = document.getElementById(this.divSelector).offsetHeight;

    var colWidth = this.width/this.cols;
    var rowHeight = this.height/this.rows;

    this.svg
      .attr("width",this.width)
      .attr("height",this.height + 15);

    var i;
    var floorPlan = Math.floor(this.supportedPlanets);

    //rearrange all underflow elements
    for(i = 0; i < floorPlan; i++){

      this.svg.select("#img_"+i)
        .attr("display","block")
        .attr("width",Math.min(colWidth,rowHeight))
        .attr("height",Math.min(colWidth,rowHeight))
        .attr("x",(this.cols==1)?(this.width/2-Math.min(colWidth,rowHeight)/2):((i%this.cols)*colWidth))
        .attr("y",(this.rows==1)?((this.height/2-Math.min(colWidth,rowHeight)/2)):(Math.floor(i/this.cols)%this.rows)*rowHeight);

    }



    //hide all overflow elements
    var ceilPlan = Math.ceil(this.maxPop);

    for(;i < ceilPlan;i++){
      this.svg.select("#img_"+i).
        attr("display","none");
    }

    d3.select("#svgText").remove();

    this.svg.append('text').
      attr("id","svgText")
      .attr("x",(this.width/2) - 35)
      .attr("y",this.height + 15);

    d3.select("#svgText").text(Math.floor(this.supportedPlanets) + " Earths");


  }

  set(value){

    this.supportedPop = (864000*this.rate)/value;
    this.supportedPlanets = ((this.supportedPop)/6528361110.699998).toFixed(2);

    this.calcLayout();
    this.redraw();


    document.getElementById(this.divSelector+"_pop").innerText = 
      Math.ceil(this.supportedPop).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
  }


}

var manager = new metaManager();
var lex;
window.document.addEventListener('DOMContentLoaded',
  ()=>{

    //no args optional. hence no object passed as single arg
    var btc = new animManager("btc_anim",
      [40.656083, -73.960590],    // starting coords
      11,                        // zoom (max 16)
      7,                         // rate of transaction
      '/json/scale/combined_ny.json', // data location
    );

    manager.managers.push(btc);
    btc.init();

    var eth = new animManager("eth_anim",
      [40.656083, -73.960590],
      11,
      14,
      '/json/scale/combined_ny.json',
    );

    manager.managers.push(eth);
    eth.init();

    var eos = new animManager("eos_anim",
      [40.656083, -73.960590],
      8,
      4000,
      '/json/scale/ny_state_comb.json',
    );

    manager.managers.push(eos);
    eos.init();

    var visa = new animManager("visa_anim",
      [40.656083, -73.960590],
      3,
      56000,
      '/json/scale/combined_global.json',
    );

    manager.managers.push(visa);
    visa.init();


    lex = new LexManager("lex_anim");  

    manager.lex= lex;
    lex.init();

    var txRates = document.getElementsByClassName('txn_rate');

    for(var i=0; i<txRates.length;i++){
      txRates[i].innerText = inverseRate(24);
    };

  });
