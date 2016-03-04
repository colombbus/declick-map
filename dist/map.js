function DeclickMap() {
    // Variables declaration
    var path;
    var chapters = [];
    var lengths = [];
    var steps = [];
    var pStep, pChapter, pChapterValidated, pStepValidated, pStepVisited, pCurrentStep;
    var sStep, sChapter, sChapterValidated, sStepValidated, sStepVisited, sCurrentStep;
    var $canvas;
    var initCenter;
    var everything;
    var currentChapterPath, currentChapterLabels;
    var chapterPaths = [];
    var chapterLabels = [];
    var targetZoom, targetCenter, target = false;
    var clickCaptured = false;
    // margin around the path
    var margin = 40;

    // Initialization
    var initView = function(canvasId) {
        // Get a reference to the canvas object
        var canvas = document.getElementById(canvasId);
        $canvas = $(canvas);
        $canvas.attr("resize", "1");
        
        // setup paperjs
        paper.setup(canvas);

        initCenter = paper.view.center;

        var dragX, dragY;

        // mouse management
        var moveTracker = function(event) {
            var p = new paper.Point(dragX - event.pageX, dragY - event.pageY);
            paper.view.scrollBy(p);
            dragX = event.pageX;
            dragY = event.pageY;
        };
        
        $canvas.click(function(event) {
            if (!clickCaptured) {
                closeChapter();
            }
            clickCaptured = false;
        });

        $canvas.mousedown(function(event) {
            dragX = event.pageX;
            dragY = event.pageY;
            $canvas.on("mousemove", moveTracker);
        });

        $canvas.mouseup(function(event) {
            $canvas.off("mousemove", moveTracker);
        });

        // handling of space key
        var tool = new paper.Tool();
        tool.onKeyDown = function(event) {
            if (event.key === 'space') {
                closeChapter();
                /*paper.view.center = initCenter;
                 paper.view.zoom = 1;*/
            }
        };

        // view resizing
        paper.view.onResize = function(event) {
            initCenter = paper.view.center;
            centerEveryting();
        };

        // Map animation
        var stepZoom = 0.05;
        var stepCenter = 10;
        paper.view.onFrame = function(event) {
            if (target) {
                var view = paper.view;
                var center = view.center;
                target = false;
                if (!center.equals(targetCenter)) {
                    target = true;
                    var vector = targetCenter.subtract(center);
                    if (vector.length > stepCenter) {
                        var step = vector.normalize(stepCenter);
                        view.center = center.add(step);
                    } else {
                        view.center = targetCenter;
                    }
                }
                if (view.zoom !== targetZoom) {
                    target = true;
                    if (view.zoom < targetZoom) {
                        view.zoom = Math.min(view.zoom + stepZoom, targetZoom);
                    } else {
                        view.zoom = Math.max(view.zoom - stepZoom, targetZoom);
                    }
                }
            }
        };
    };

    var initSymbols = function() {
        pChapter = new paper.Path.Circle(new paper.Point(0, 0), 12);
        pChapter.strokeColor = "#E01980";
        pChapter.strokeWidth = 2;
        pChapter.fillColor = "#46102A";
        sChapter = new paper.Symbol(pChapter);
        pStep = new paper.Path.Circle(new paper.Point(0, 0), 8);
        pStep.strokeColor = "#E33022";
        pStep.strokeWidth = 1;
        pStep.fillColor = "#46102A";
        sStep = new paper.Symbol(pStep);
        pStepValidated = new paper.Group();
        var pStepValidatedOuter = new paper.Path.Circle(new paper.Point(0, 0), 8);
        pStepValidatedOuter.strokeColor = "#E33022";
        pStepValidatedOuter.strokeWidth = 1;
        pStepValidatedOuter.fillColor = "#46102A";
        var pStepValidatedInner = new paper.Path.Circle(new paper.Point(0, 0), 6);
        pStepValidatedInner.fillColor = "#0FAC8D";
        pStepValidated.addChild(pStepValidatedOuter);
        pStepValidated.addChild(pStepValidatedInner);
        sStepValidated = new paper.Symbol(pStepValidated);
        pChapterValidated = new paper.Group();
        var pChapterValidatedOuter = new paper.Path.Circle(new paper.Point(0, 0), 12);
        pChapterValidatedOuter.strokeColor = "#E01980";
        pChapterValidatedOuter.strokeWidth = 2;
        pChapterValidatedOuter.fillColor = "#46102A";
        var pChapterValidatedInner = new paper.Path.Circle(new paper.Point(0, 0), 10);
        pChapterValidatedInner.fillColor = "#0FAC8D";
        pChapterValidated.addChild(pChapterValidatedOuter);
        pChapterValidated.addChild(pChapterValidatedInner);
        sChapterValidated = new paper.Symbol(pChapterValidated);
        pStepVisited = new paper.Path.Circle(new paper.Point(0, 0), 6);
        pStepVisited.fillColor = "#E33022";
        sStepVisited = new paper.Symbol(pStepVisited);
    };
    
    this.init = function(canvasId) {
        initView(canvasId);
        initSymbols();
    };

    var centerEveryting = function() {
        everything.position = paper.view.center;
    };

    // Path loading
    this.loadPath = function(data) {
        // create path from SVG data
        path = new paper.Path(data.data);
        path.fitBounds(paper.view.bounds.expand(-margin));
        if (data.color) {
            path.strokeColor = data.color;
        }
        if (data.opacity) {
            path.opacity = data.opacity;
        }

        if (data.width) {
            path.strokeWidth = data.width;
        }

        // init lengths table
        var curves = path.curves;
        for (var i = 0; i < curves.length; i++) {
            lengths.push(curves[i].length);
        }
        everything = new paper.Group();
        everything.addChild(path);
        centerEveryting();
    };
    
    this.loadPathFromJSON = function(file, callback) {
        var self = this;
        $.getJSON(file, function(pathData) {
            self.loadPath(pathData);
            if (callback) {
                callback();
            }
        });        
    };

    // Steps loading
    this.loadSteps = function(data) {
        initSteps(data);
        displaySteps();
        paper.view.draw();
    };

    this.loadStepsFromJSON = function(file, callback) {
        var self = this;
        $.getJSON(file, function(stepsData) {
            self.loadSteps(stepsData);
            if (callback) {
                callback();
            }
        });
    };
    
    var initSteps = function(data) {
        function getObject(value, type) {
            var object = {type: type, name: value.name};
            if (value.passed) {
                object.passed = value.passed;
            }
            if (value.current) {
                object.current = value.current;
            }
            if (value.visited) {
                object.visited = value.visited;
            }
            return object;
        }
        $.each(data, function(key, value) {
            steps.push(getObject(value, "chapter"));
            if (value.steps) {
                $.each(value.steps, function(key, value) {
                    steps.push(getObject(value, "item"));
                });
            }
        });
    };

    var openStep = function(index) {
        $("#text").text("Ouverture de l'item '" + steps[index].name + "'");
    };

    var closeChapter = function() {
        if (currentChapterPath) {
            currentChapterPath.visible = false;
            currentChapterLabels.visible = false;
        }
        targetZoom = 1;
        targetCenter = initCenter;
        target = true;
        $canvas.css("cursor", "default");
    };

    var openChapter = function(index) {
        if (currentChapterPath) {
            currentChapterPath.visible = false;
            currentChapterLabels.visible = false;
        }
        if (index < chapterPaths.length) {
            currentChapterPath = chapterPaths[index];
            currentChapterPath.visible = true;
            currentChapterLabels = chapterLabels[index];
            currentChapterLabels.visible = true;
            var bounds = currentChapterPath.bounds;
            bounds = bounds.expand(margin);
            targetCenter = bounds.center;
            var zHeight = paper.view.bounds.height / (bounds.height);
            var zWidth = paper.view.bounds.width / (bounds.width);
            targetZoom = paper.view.zoom * Math.min(zHeight, zWidth);
            target = true;
            $canvas.css("cursor", "pointer");
        } else {
            currentChapterPath = null;
        }
    };


    var wordwrap = function(txt,max) {
        var lines=[];
        var space=-1;
        times=0;
        function cut() {
            for(var i=0;i<txt.length;i++) {
                (txt[i]==' ')&&(space=i);
                if(i>=max) {
                    (space==-1||txt[i]==' ')&&(space=i);
                    if(space>0) {
                        lines.push(txt.slice((txt[0]===' '?1:0),space));
                    }
                    txt = txt.slice(txt[0]===' '?(space+1):space);
                    space=-1;
                    break;
                }
            }
            check();
        }

        function check() {
            if(txt.length<=max) {
                lines.push(txt[0]===' '?txt.slice(1):txt);txt='';
            } else if (txt.length) {
                cut();
            }
            return;
        }
        check();
        return lines.join('\n');
    }

    // Position steps on the path
    var displaySteps = function(data) {
        var previousChapter = false;
        var previousLabel;
        var currentLabels;
        var basePath = path.clone();

        var getSymbol = function(step) {
            if (step.type === "chapter") {
                if (step.passed) {
                    return sChapterValidated;
                } else {
                    return sChapter;
                }
            } else {
                if (step.passed) {
                    return sStepValidated;
                } else if (step.visited) {
                    return sStepVisited;
                } else {
                    return sStep;
                }
            }
        };

        var placeSymbol = function(index, curve, length) {
            var chapter = false;
            var symbol = getSymbol(steps[index]);
            var point = curve.getPointAt(length, false);
            var placed = symbol.place(point);
            if (steps[index].type === "chapter") {
                chapter = true;
            }
            everything.addChild(placed);
            if (chapter) {
                if (previousChapter) {
                    var offset = basePath.getOffsetOf(placed.position);
                    var newPath = basePath.split(offset);
                    var chapterPath = basePath;
                    chapterPath.visible = false;
                    chapterPaths.push(chapterPath);
                    basePath = newPath;
                    everything.addChild(currentLabels);
                    chapterLabels.push(currentLabels);
                }
                previousChapter = true;
                chapters.push(placed);
                currentLabels = new paper.Group();
                currentLabels.visible = false;
                placed.onMouseDown = getChapterMouseHandler(chapters.length - 1);
                // display chapter number
                var textNumber = new paper.PointText({
                    point: point,
                    justification: 'center',
                    fontSize: 15,
                    fillColor: "#FFFFFF",
                    content: chapters.length
                });
                textNumber.bounds.center = point;
                textNumber.onMouseDown = getChapterMouseHandler(chapters.length - 1);
                everything.addChild(textNumber);
            } else {
                placed.onMouseDown = getMouseHandler(index);
            }
            placed.onMouseEnter = mouseEnterHandler;
            placed.onMouseLeave = mouseLeaveHandler;
            var textColor, textSize, textShift;
            if (chapter) {
                textColor = "#E01980";
                textSize = 15;
                textShift = 20;
            } else {
                textColor = "#FFFFFF";
                textSize = 8;
                textShift = 15;
            }
            var normal = curve.getNormalAt(length, false);
            normal.length = textShift;
            var text = new paper.PointText({
                point: point.add(normal/*new paper.Point(textShift, textSize/3)*/),
                justification: 'left',
                fontSize: textSize,
                fillColor: textColor,
                content: steps[i].name
            });
            if (!chapter) {
                if (previousLabel && previousLabel.bounds.intersects(text.bounds)) {
                    normal = normal.multiply(-2);
                    text.point = text.point.add(normal);
                }
                previousLabel = text;
                currentLabels.addChild(text);
                text.onMouseDown = getMouseHandler(index);
            } else {
                text.content = wordwrap(steps[i].name, 12);
                if (text.intersects(path)) {
                    normal = normal.multiply(-2);
                    text.point = text.point.add(normal);
                }
                everything.addChild(text);
                text.onMouseDown = getChapterMouseHandler(chapters.length - 1);
                previousLabel = null;
            }
            text.onMouseEnter = mouseEnterHandler;
            text.onMouseLeave = mouseLeaveHandler;
            return placed;
        };

        var getMouseHandler = function(i) {
            return function(event) {
                openStep(i);
                event.preventDefault();
                clickCaptured = true;
            };
        };

        var getChapterMouseHandler = function(i) {
            return function(event) {
                openChapter(i);
                event.preventDefault();
                clickCaptured = true;
            };
        };

        var mouseEnterHandler = function(event) {
            $canvas.css("cursor", "pointer");
        };

        var mouseLeaveHandler = function(event) {
            if (!currentChapterPath) {
                $canvas.css("cursor", "default");
            }
        };

        var stepLength = path.length / (steps.length - 1);
        var curves = path.curves;
        var currentIndex = 0;
        var currentCurve = curves[0];
        var currentLength = 0;
        for (var i = 0; i < steps.length - 1; i++) {
            while (currentLength > currentCurve.length) {
                currentLength -= currentCurve.length;
                currentIndex++;
                currentCurve = curves[currentIndex];
            }
            placeSymbol(i, currentCurve, currentLength);
            currentLength += stepLength;
        }
        currentCurve = curves[curves.length - 1];
        placeSymbol(i, currentCurve, currentCurve.length);
    };
}

