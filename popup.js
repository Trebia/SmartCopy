//Development Global Variables
var devblocksend = false; //Blocks the sending data to Geni, prints output to console instead
var locationtest = false; //Verbose parsing of location data
var smartcopyurl = "https://historylink.herokuapp.com";  //helpful for local testing to switch from https to http

//Common Global Variables
var profilechanged = false, loggedin = false, parentblock = false, submitcheck = true, captcha = false;
var accountinfo, focusid, tablink, genifamily, parentspouseunion, genigender, geniliving, genifocusdata;
var focusURLid = "", focusname = "", focusrange = "", recordtype = "", smscorefactors = "", googlerequery = "";
var buildhistory = [], marriagedates = [], parentspouselist = [], siblinglist = [];
var genifamilydata = {}, genibuildaction = {}, updatecount = 1, updatetotal = 0;
var errormsg = "#f9acac", warningmsg = "#f8ff86", infomsg = "#afd2ff";


chrome.storage.local.get('buildhistory', function (result) {
    if (exists(result.buildhistory)) {
        buildhistory = result.buildhistory;
        buildHistoryBox();
    }
});

function buildHistoryBox() {
    var historytext = "";
    for (var i = 0; i < buildhistory.length; i++) {
        var name = buildhistory[i].id;
        if (exists(buildhistory[i].name)) {
            name = buildhistory[i].name;
        }
        var datetxt = "";
        if (exists(buildhistory[i].date)) {
            var day = new Date(buildhistory[i].date);
            datetxt = (("00" + (day.getMonth() + 1))).slice(-2) + "-" + ("00" + day.getDate()).slice(-2) + "@" + ("00" + day.getHours()).slice(-2) + ":" + ("00" + day.getMinutes()).slice(-2) + ": ";
            //moment(buildhistory[i].date).format("MM-DD@HH:mm") + ': ';
        }
        var focusprofileurl = "";
        if (exists(buildhistory[i].id)) {
            if (buildhistory[i].id.startsWith("profile-g")) {
                focusprofileurl = "http://www.geni.com/profile/index/" + buildhistory[i].id.replace("profile-g", "");
            } else {
                focusprofileurl = "http://www.geni.com/" + buildhistory[i].id;
            }
            if (exists(buildhistory[i].data)) {
                historytext += '<span class="expandhistory" name="history' + buildhistory[i].id + '" style="font-size: large; cursor: pointer;"><img src="images/dropdown.png" style="width: 11px;"></span> ' + datetxt + '<a href="' + focusprofileurl + '" target="_blank">' + name + '</a><br/>';
                historytext += formatJSON(buildhistory[i].data, "", buildhistory[i].id);
            } else {
                historytext += '<span style="padding-left: 2px; padding-right: 2px;">&#x25cf;</span> ' + datetxt + '<a href="' + focusprofileurl + '" target="_blank">' + name + '</a><br/>';
            }
        }
    }
    $("#historytext").html(historytext);
    $(function () {
        $('.expandhistory').on('click', function () {
            expandFamily($(this).attr("name"));
        });
    });
}

function formatJSON(datastring, historytext, id) {
    if (typeof datastring === 'string' && datastring.length > 0) {
        var p = JSON.parse(datastring);
        historytext = '<ul id="slidehistory' + id + '" style="display: none;">';
    } else {
        var p = datastring;
    }
    for (var key in p) {
        if (p.hasOwnProperty(key)) {
            if (key !== 'about_me') {
                if (typeof datastring === 'string') {
                    historytext += '<li>';
                }
                if (typeof p[key] === 'object') {
                    historytext += '<b>' + key + "</b>: " + formatJSON(p[key], "", "");

                } else {
                    historytext += '<b>' + key + "</b> -> " + p[key] + " ";
                }
                if (typeof datastring === 'string') {
                    historytext += '</li>';
                }
            }
        }
    }
    if (typeof datastring === 'string' && datastring.length > 0) {
        historytext += '</ul>';
    }
    return historytext;
}

function buildHistorySelect() {
    var historytext = "";
    for (var i = 0; i < buildhistory.length; i++) {
        var name = buildhistory[i].id;
        if (exists(buildhistory[i].name)) {
            name = buildhistory[i].name;
        }
        historytext += '<option value="' + buildhistory[i].id + '">History: ' + name + '</option>';
        if (i > 30) {
            break;
        }
    }
    return historytext;
}

var dateformatter = ["MMM YYYY", "MMMM YYYY", "MMM D YYYY", "MMMM D YYYY", "YYYY", "MM/ /YYYY", "D MMM YYYY"];
//noinspection JSUnusedGlobalSymbols
var expandparent = true; //used in expandAll function window[...] var call
//noinspection JSUnusedGlobalSymbols
var expandpartner = true; //same
//noinspection JSUnusedGlobalSymbols
var expandsibling = true; //same
//noinspection JSUnusedGlobalSymbols
var expandchild = true; //samet

// Run script as soon as the document's DOM is ready.
if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str) {
        if (typeof str === "undefined") {
            return false;
        }
        return this.slice(0, str.length) == str;
    }
}
if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function (str) {
        if (typeof str === "undefined") {
            return false;
        }
        return this.substring(this.length - str.length, this.length) === str;
    }
}
if (!String.prototype.contains) {
    String.prototype.contains = function () {
        return String.prototype.indexOf.apply(this, arguments) !== -1;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    console.log(chrome.runtime.getManifest().name + " v" + chrome.runtime.getManifest().version);
    $("#versionbox").html("SmartCopy v" + chrome.runtime.getManifest().version);
    $("#versionbox2").html("SmartCopy v" + chrome.runtime.getManifest().version);
    loginProcess();
});

function startsWithHTTP(url, match) {
    //remove protocol and comapre
    url = url.replace("https://", "").replace("http://", "");
    match = match.replace("https://", "").replace("http://", "");
    return url.startsWith(match);
}

var collections = new Array();
var collection;
function registerCollection(collection) {
  collections.push(collection);
}

function loginProcess() {

    if (!loggedin) {
        loadLogin();
    } else {
        chrome.tabs.query({"currentWindow": true, "status": "complete", "windowType": "normal", "active": true}, function (tabs) {
            var tab = tabs[0];
            tablink = tab.url;

            if (isGeni(tablink)) {
                document.querySelector('#message').style.display = "none";
                var focusprofile = getProfile(tablink);
                focusid = focusprofile.replace("?profile=", "");
                document.getElementById("addhistoryblock").style.display = "block";
                updateLinks(focusprofile);
                userAccess();
            } else {
                // Select collection
                for (var i=0; i<collections.length; i++) {
                    if (collections[i].collectionMatch(tablink)) {
                        collection = collections[i];
                        tablink = collection.prepareUrl(tablink);
                        recordtype = collection.recordtype;
                        if (collection.experimental) {
                            $("#experimentalmessage").css("display", "block");
                        }
                        console.log("Collection: " + recordtype);
                        break;
                    }
                }

                // Parse data
                if (exists(collection) && collection.parseData) {
                    console.log("Going to parse data now");
                    collection.parseData(tablink);
                } else {
                    console.log("Could not find collection on " + tablink);
                    document.querySelector('#loginspinner').style.display = "none";
                    setMessage(errormsg, 'SmartCopy does not currently support parsing this page / site / collection.');
                }
            }
        });
    }
}

var slideopen = false;
$('#genislider').on('click', function () {
    if (slideopen) {
        $("body").animate({ 'max-width': "340px" }, 'slow');
        $(".genisliderow").not(".genihidden").slideToggle();
        $("#controlimage").slideUp();
        $(this).find("img")[0].src = "images/openmenu.png";
        $("#configtext").hide();
    } else {
       // $("body").animate({ 'max-width': "550px" }, 'slow');
        $("body").animate({ 'max-width': "500px" }, 'slow');
        $(".genisliderow").not(".genihidden").slideToggle();
        $("#controlimage").slideDown();
        $(this).find("img")[0].src = "images/closemenu.png";
        $("#configtext").show();
    }
    slideopen = !slideopen;
});


function isGeni(url) {
    return (startsWithHTTP(url,"http://www.geni.com/people") || startsWithHTTP(url,"http://www.geni.com/family-tree") || startsWithHTTP(url,"http://www.geni.com/profile"));
}

function userAccess() {
    if (loggedin && exists(accountinfo)) {
        if (focusid !== "") {
            chrome.runtime.sendMessage({
                method: "GET",
                action: "xhttp",
                url: smartcopyurl + "/account?profile=" + focusid,
                variable: ""
            }, function (response) {
                document.querySelector('#loginspinner').style.display = "none";
                var responsedata = JSON.parse(response.source);
                var accessdialog = document.querySelector('#useraccess');
                accessdialog.style.display = "block";
                if (!responsedata.big_tree) {
                    setMessage(infomsg, '<strong>This profile is not in the World Family Tree.</strong>');
                    accessdialog.style.marginBottom = "-2px";
                }
                if (accountinfo.curator && responsedata.claimed && !responsedata.curator) {
                    if (!responsedata.user) {
                        $(accessdialog).html('<div style="padding-top: 2px;"><strong>This user has limited rights on SmartCopy.</strong></div><div style="padding-top: 6px;"><button type="button" id="grantbutton" class="cta cta-blue">Grant Tree-Building</button></div>' +
                            '<div>Granting tree-building rights will give this user the ability to add profiles to the Geni tree via SmartCopy.  If you notice they are not being responsible with the tool, you can revoke the rights.</div>');
                        document.getElementById('grantbutton').addEventListener('click', useradd, false);
                    } else {
                        if (responsedata.user.revoked == null) {
                            $(accessdialog).html('<div style="padding-top: 2px;"><strong>This user has tree-building rights on SmartCopy.</strong></div><div style="padding-top: 6px;"><button type="button" id="revokebutton" class="cta cta-red">Revoke Tree-Building</button></div>' +
                                '<div>Tree-building rights were granted by <a href="http://www.geni.com/' + responsedata.user.sponsor + '" target="_blank">' + responsedata.user.sname + '</a> on ' + responsedata.user.sponsordate + ' UTC</div>');
                            document.getElementById('revokebutton').addEventListener('click', userrevoke, false);
                        } else {
                            $(accessdialog).html('<div style="padding-top: 2px;"><strong>This user has limited rights on SmartCopy.</strong></div><div style="padding-top: 6px;"><button type="button" id="grantbutton" class="cta cta-yellow">Restore Tree-Building</button></div>' +
                                '<div>Tree-building rights were revoked by <a href="http://www.geni.com/' + responsedata.user.revoked + '" target="_blank">' + responsedata.user.rname + '</a> on ' + responsedata.user.revokedate + ' UTC</div>');
                            document.getElementById('grantbutton').addEventListener('click', userrestore, false);
                        }
                    }
                } else {
                    $(accessdialog).html("<div style='font-size: 115%;'><strong>Research this Person</strong></div>Loading...");
                    buildResearch();
                }
            });
        } else {
            setMessage(warningmsg, "Invalid Profile Id - Try Again");
        }
    } else {
        setTimeout(userAccess, 200);
    }
}

function userrestore() {
    document.querySelector('#useraccess').style.display = "none";
    document.querySelector('#loginspinner').style.display = "block";
    var prefixurl = smartcopyurl + "/account?profile=" + focusid;
    chrome.runtime.sendMessage({
        method: "GET",
        action: "xhttp",
        url: prefixurl + "&action=add_user",
        variable: ""
    }, function (response) {
        window.close();
    });
}

function useradd() {
    document.querySelector('#useraccess').style.display = "none";
    document.querySelector('#loginspinner').style.display = "block";
    var prefixurl = smartcopyurl + "/account?profile=" + focusid;
    chrome.runtime.sendMessage({
        method: "GET",
        action: "xhttp",
        url: prefixurl + "&action=add_user",
        variable: ""
    }, function (response) {
    });
    chrome.tabs.query({"currentWindow": true, "status": "complete", "windowType": "normal", "active": true}, function (tabs) {
        var tab = tabs[0];
        chrome.tabs.update(tab.id, {url: "http://www.geni.com/threads/new/" + focusid.replace("profile-g", "") + "?return_here=true"}, function (tab1) {
            var listener = function(tabId, changeInfo, tab) {
                if (tabId == tab1.id && changeInfo.status === 'complete') {
                    // remove listener, so only run once
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.executeScript(tab1.id, {
                        code: "document.getElementById('thread_subject').value='SmartCopy Invite';" +
                            "document.getElementById('msg_body').value='I have granted you tree-building rights with SmartCopy, " +
                            "which is a Google Chrome extension that allows Geni users to copy information and profiles from various sources into Geni.\\n\\n" +
                            "The extension can be downloaded here: https://historylink.herokuapp.com/smartcopy\\n" +
                            "More information and discussion can be found in the Geni project: http://www.geni.com/projects/SmartCopy/18783\\n\\n" +
                            "Before using SmartCopy, please read the cautionary notes in the Project Description. " +
                            "SmartCopy can be a powerful tool to help us build the world tree, but it could also quickly create duplication and introduce bad data - be responsible.\\n\\n" +
                            "*********************************************************\\n" +
                            "Users granted rights to SmartCopy are expected to review for and avoid creating duplicates, merge or delete profiles when duplicates are created, and attempt to work through relationship conflicts that may arise (get curator assistance if necessary).\\n" +
                            "*********************************************************" +
                            "';"
                    }, function () {
                        window.close();
                    })
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    });
}

function userrevoke() {
    document.querySelector('#useraccess').style.display = "none";
    document.querySelector('#loginspinner').style.display = "block";
    var prefixurl = smartcopyurl + "/account?profile=" + focusid;
    chrome.runtime.sendMessage({
        method: "GET",
        action: "xhttp",
        url: prefixurl + "&action=revoke_user",
        variable: ""
    }, function (response) {
        window.close();
    });
}

function startsWithMH(stringToCheck, query) {
    var searchPattern = new RegExp('^https?://www\.myheritage\..*?/' + query, 'i');
    return searchPattern.test(stringToCheck);
}

function updateLinks(focusprofile) {
    $("#historyurl").attr("href", "https://historylinktools.herokuapp.com/history" + focusprofile);
    $("#graphurl").attr("href", "https://historylinktools.herokuapp.com/graph" + focusprofile + "&color=gender");
    $("#descendanturl").attr("href", "https://historylinktools.herokuapp.com/graph" + focusprofile + "&type=descendant&color=gender");
}

chrome.runtime.onMessage.addListener(function (request, sender, callback) {
    if (request.action == "getSource") {
        loadPage(request);
    }
});

function loadPage(request) {
    if (!profilechanged) {
        if (collection.parseProfileData) {
            if (collection.loadPage) {
                if (exists(request.source)) {
                    collection.loadPage(request);
                } else {
                    document.getElementById("top-container").style.display = "block";
                    document.getElementById("submitbutton").style.display = "none";
                    document.getElementById("loading").style.display = "none";
                    console.log("Error trying to read: " + tablink);
                    var error = "";
                    if (exists(request.error)) {
                        if (typeof request.error === 'string' && request.error !== "") {
                            error = " Error: " + request.error;
                            console.log(error);
                        } else if (typeof request.error === 'object' && !$.isEmptyObject(request.error)) {
                            error = " Error: " + JSON.stringify(request.error);
                            console.log(error);
                        }
                    }
                    setMessage(warningmsg, 'SmartCopy is having difficulty reading the page.  Try refreshing the page.' + error);
                }
            }
            if (!profilechanged && focusURLid !== "") {
                for (var i = 0; i < buildhistory.length; i++) {
                    if (buildhistory[i].itemId === focusURLid) {
                        focusid = buildhistory[i].id;
                        profilechanged = true;
                        loadPage(request);
                        return;
                    }
                }
            }
            if (collection.parseProfileData && !profilechanged) {
                loadSelectPage(request);
            }
        } else {
            document.getElementById("top-container").style.display = "block";
            document.getElementById("submitbutton").style.display = "none";
            document.getElementById("loading").style.display = "none";
            setMessage(warningmsg, 'This website is not yet supported by SmartCopy.');
        }
    } else {
        document.getElementById("top-container").style.display = "block";
        if (focusid === "" || focusid === "Select from History") {
            var accessdialog = document.querySelector('#useraccess');
            accessdialog.style.marginBottom = "-2px";
            accessdialog.innerText = "The URL or ID entered failed to resolve.";
            accessdialog.style.backgroundColor = errormsg;
            accessdialog.style.display = "block";
            focusid = null;
        }
        if (exists(focusid)) {
            if (collection.redirect) {
                var redirect = collection.redirect(request);
                if (redirect) {
                    return;
                }
            }
            $("#focusname").html('<span id="genilinkdesc"><a href="' + 'http://www.geni.com/' + focusid + '" target="_blank" style="color:inherit; text-decoration: none;">' + focusname + "</a></span>");
            if (focusrange !== "") {
                document.getElementById("focusrange").innerText = focusrange;
            }
            var accessdialog = document.querySelector('#useraccess');
            accessdialog.style.display = "none";
            accessdialog.style.marginBottom = "12px";
            accessdialog.innerText = "";
            accessdialog.style.backgroundColor = "#dfe6ed";

            familystatus.push(1);
            var descurl = smartcopyurl + "/smartsubmit?family=self&profile=" + focusid;
            chrome.runtime.sendMessage({
                method: "GET",
                action: "xhttp",
                url: descurl
            }, function (response) {
                var geni_return = JSON.parse(response.source);
                focusid = geni_return.id; //In case there is a merge_into return
                // $('#focusjsontable').json2html(response.source,focustransform);
                genifocusdata = new GeniPerson(geni_return);
                var permissions = genifocusdata.get("actions");
                if (!exists(permissions)) {
                    document.getElementById("top-container").style.display = "block";
                    document.getElementById("submitbutton").style.display = "none";
                    document.getElementById("loading").style.display = "none";
                    setMessage(errormsg, 'SmartCopy was unable to retrieve the focus profile data from Geni.');
                    console.log(geni_return);
                    return
                } else if (permissions.length === 0) {
                    document.getElementById("top-container").style.display = "block";
                    document.getElementById("submitbutton").style.display = "none";
                    document.getElementById("loading").style.display = "none";
                    setMessage(warningmsg, 'Geni replies that you have no permissions on the focus profile.  The profile may be private and inaccessible or you may need to reauthenticate SmartCopy on Geni. ' +
                        'You can reauthenticate by <a href="' + smartcopyurl + '/logout" target="_blank">clicking here</a> and rerunning SmartCopy.');
                    return
                }
                var matches = genifocusdata.get("matches");
                if (matches.tree_match > 0) {
                    $("#treematchurl").attr("href", "https://www.geni.com/search/matches?id=" + genifocusdata.get("guid") + "&src=smartcopy&cmp=btn");
                    $("#treematchcount").text(" " + matches.tree_match + " ");
                    $("#treematches").show();
                    if (!accountinfo.pro) {
                        $("#treematchtext").show();
                    }
                };
                var url = smartcopyurl + "/smartsubmit?family=all&profile=" + focusid;
                chrome.runtime.sendMessage({
                    method: "GET",
                    action: "xhttp",
                    url: url
                }, function (response) {
                    genifamily = JSON.parse(response.source);
                    //$('#familyjsontable').json2html(response.source,familytransform);
                    buildParentSpouse(true);
                    familystatus.pop();
                });
                //Update focusname again in case there is a merge_into
                $("#focusname").html('<span id="genilinkdesc"><a href="' + 'http://www.geni.com/' + focusid + '" target="_blank" style="color:inherit; text-decoration: none;">' + focusname + "</a></span>");
                var byear;
                var dyear;
                var dateinfo = "";
                if (exists(geni_return["birth"]) && exists(geni_return["birth"]["date"])) {
                    var matches = geni_return["birth"]["date"].match(/\d+$/);
                    if (matches) {
                        byear = matches[0];
                    }
                }
                if (exists(geni_return["death"]) && exists(geni_return["death"]["date"])) {
                    var matches = geni_return["death"]["date"].match(/\d+$/);
                    if (matches) {
                        dyear = matches[0];
                    }
                }
                if (exists(byear) || exists(dyear)) {
                    dateinfo = " (";
                    if (exists(byear)) {
                        dateinfo += "b." + byear;
                        if (exists(dyear)) {
                            dateinfo += "-";
                        }
                    }
                    if (exists(dyear)) {
                        dateinfo += "d." + dyear;
                    }
                    dateinfo += ")";
                }
                genigender = geni_return.gender;
                geniliving = geni_return.is_alive;
                $("#genilinkdesc").attr('title', "Geni: " + geni_return.name + dateinfo);
            });
            console.log("Parsing Family...");
            // generic call
            if (collection.parseProfileData) {
                collection.parseProfileData(request.source, true);
            } else {
                setMessage(warningmsg, 'There was a problem with the collection - please report with link to page.');
            }
            if (!accountinfo.user || (exists(accountinfo.user.revoked) && accountinfo.user.revoked !== null)) {
                //document.getElementById("loading").style.display = "none";
                $("#familymembers").attr('disabled', 'disabled');
                setMessage(warningmsg, 'Use of SmartCopy for copying Family Members to Geni is managed.  You may <a class="ctrllink" url="https://www.geni.com/discussions/147619">request this ability from a Curator</a>.');
            }
        } else {
            loadSelectPage(request);
        }
    }
}

function loadSelectPage(request) {
    //document.getElementById("smartcopy-container").style.display = "none";
    document.getElementById("loading").style.display = "none";
    setMessage(infomsg, 'SmartCopy was unable to determine the Geni profile to use as a copy destination.<br/><br/>' +
        '<strong><span id="changetext" title="Select the profile on Geni that matches the focus person on this page.">Set Geni Destination Profile</span></strong>' +
        '<table style="width: 100%;"><tr><td colspan="2" style="width: 100%; font-size: 90%; text-align: left;"><strong><span id="optionrel" style="display: none;">Relatives &&nbsp;</span><span id="optionsc">SmartCopy&nbsp;</span>History:</strong></td></tr>' +
        '<tr id="optionrowldr"><td colspan="2" style="width: 100%; text-align: left; font-size: 90%; padding-left: 20px;">Loading Geni Relatives <img src="images/spinnerlg.gif" style="height: 16px; margin-bottom: -4px;"></td></tr>' +
        '<tr id="optionrow" style="display: none;"><td id="focusoption" style="width: 100%; text-align: left;"></td></tr>' +
        '<tr><td colspan="2" style="width: 100%; font-size: 90%; text-align: left;"><strong>Geni ID or URL:</strong></td></tr>' +
        '<tr><td style="padding-right: 5px;"><input type="text" style="width: 100%;" id="changeprofile"></td></tr>' +
        '<tr><td style="padding-top: 5px;"><button id="changefocus">Set Destination</button></td></tr></table>');
    var parsed = $('<div>').html(request.source.replace(/<img[^>]*>/ig, ""));
    var focusperson = parsed.find(".individualInformationName").text().trim();
    var focusprofile = parsed.find(".individualInformationProfileLink").attr("href");
    if (exists(focusprofile) && focusprofile.contains("myheritage.com")) {
        focusprofile = null;
    }
    $('#changefocus').off();
    $('#changefocus').on('click', function () {
        changepersonevent();
    });
    $('#changeprofile').off();
    $('#changeprofile').keyup( function(e) {
        var key=e.keyCode || e.which;
        if (key==13){
            changepersonevent();
        }
    });
    function changepersonevent() {
        var profilelink = getProfile($('#changeprofile')[0].value);
        if (profilelink === "") {
            var focusselect = $('#focusselect')[0];
            if (exists(focusselect)) {
                profilelink = "?profile=" + focusselect.options[focusselect.selectedIndex].value;
            }
        }
        if (profilelink !== "" || devblocksend) {
            updateLinks(profilelink);
            focusid = profilelink.replace("?profile=", "");
            document.querySelector('#message').style.display = "none";
            document.getElementById("smartcopy-container").style.display = "block";
            document.getElementById("loading").style.display = "block";
            profilechanged = true;
            loadPage(request);
        } else {
            var invalidtext = $("#changetext")[0];
            invalidtext.innerText = "Invalid Profile Id - Try Again";
            invalidtext.style.color = 'red';
        }
    }
    if (exists(focusprofile)) {
        $('#optionrel').css("display", "inline-block");
        $('#optionsc').css("display", "none");
        focusprofile = focusprofile.replace("http://www.geni.com/", "").replace("https://www.geni.com/", "").trim();
        var url = smartcopyurl + "/smartsubmit?family=all&profile=" + focusprofile;
        chrome.runtime.sendMessage({
            method: "GET",
            action: "xhttp",
            url: url
        }, function (response) {
            genifamily = JSON.parse(response.source);
            buildParentSpouse(false);
            var result = genifamily;
            result.sort(function (a, b) {
                var relA = a.relation.toLowerCase(), relB = b.relation.toLowerCase();
                if (relA < relB) //sort string ascending
                    return -1;
                if (relA > relB)
                    return 1;
                return 0; //default return value (no sorting)
            });
            var selectsrt = '<select id="focusselect" style="width: 100%;"><option>Select relative of ' + focusperson + '</option>';
            if (exists(result)) {
                for (var key in result) if (result.hasOwnProperty(key)) {
                    var person = result[key];
                    if (exists(person.name)) {
                        selectsrt += '<option value="' + person.id + '">' + capFL(person.relation) + ": " + person.name + '</option>';
                    }
                }
                if (buildhistory.length > 0) {
                    selectsrt += '<option disabled>&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;</option>';
                }
            }
            selectsrt += buildHistorySelect();
            selectsrt += '</select>';
            $('#optionrowldr').css("display", "none");
            $('#optionrow').css("display", "table-row");
            $('#focusoption').html(selectsrt);
        });
    } else {
        var selectsrt = '<select id="focusselect" style="width: 100%;"><option>Select from History</option>';
        selectsrt += buildHistorySelect();
        selectsrt += '</select>';
        $('#optionrowldr').css("display", "none");
        $('#optionrow').css("display", "table-row");
        $('#focusoption').html(selectsrt);
    }
}

function buildParentSpouse(finalid) {
    if (exists(genifamily)) {
        var siblings = false;
        var parents = false;
        var parval = {male: 0, female: 0, unknown: 0};
        var sibval = {male: 0, female: 0, unknown: 0};
        var chval = {male: 0, female: 0, unknown: 0};
        var spval = {male: 0, female: 0, unknown: 0};
        for (var i = 0; i < genifamily.length; i++) {
            var familymem = genifamily[i];
            genifamilydata[familymem.id] = new GeniPerson(familymem);
            familymem.relation = familymem.relation.toLowerCase();
            if (isParent(familymem.relation)) {
                parval = countGeniMem(parval, familymem.relation);
                parents = true;
                if (finalid) {
                    document.getElementById("parentsearch").style.display = "none";
                }
                if (!parentblock) {
                    parentspouseunion = familymem.union;
                    parentblock = true;
                } else {
                    //If there are two parents - reset
                    parentspouselist = [];
                    parentblock = false;
                }
            } else if (isSibling(familymem.relation)) {
                sibval = countGeniMem(sibval, familymem.relation);
                siblings = true;
            } else if (isChild(familymem.relation)) {
                chval = countGeniMem(chval, familymem.relation);
            } else if (isPartner(familymem.relation)) {
                spval = countGeniMem(spval, familymem.relation);
            }
        }
        if (finalid) {
            buildGeniCount(parval, "parentcount");
            buildGeniCount(sibval, "siblingcount");
            buildGeniCount(spval, "partnercount");
            buildGeniCount(chval, "childcount");
        }
        if (!parents && siblings) {
            for (var i = 0; i < genifamily.length; i++) {
                var familymem = genifamily[i];
                if (isSibling(familymem.relation)) {
                    parentspouseunion = familymem.union;
                    parentblock = true;
                    break;
                }
            }
        }
    }
}

function countGeniMem(val, rel) {
    if (isMale(rel)) {
        val.male += 1;
    } else if (isFemale(rel)) {
        val.female += 1;
    } else {
        val.unknown += 1;
    }
    return val;
}

function buildGeniCount(val, name) {
    if (val) {
        var genifmcount = "";
        if (val.male > 0) {
            genifmcount += " " + val.male + " <span class='malebox'></span>";
        }
        if (val.female > 0) {
            genifmcount += " " + val.female + " <span class='femalebox'></span>";
        }
        if (val.unknown > 0) {
            genifmcount += " " + val.unknown + " <span class='unknownbox'></span>";
        }
        if (genifmcount.length > 0) {
            genifmcount = " &mdash; Geni has" + genifmcount;
            $(name).html(genifmcount);
        }
    }
}

function setMessage(color, messagetext) {
    var message = $('#message');
    message.css("backgroundColor", color);
    message.css("display", "block");
    message.html(messagetext);
}

function getPageCode() {
    if (loggedin && exists(accountinfo)) {
        document.querySelector('#message').style.display = "none";
        document.querySelector('#loginspinner').style.display = "none";
        document.getElementById("smartcopy-container").style.display = "block";
        document.getElementById("loading").style.display = "block";

        if (collection.reload) {
            chrome.runtime.sendMessage({
                method: "GET",
                action: "xhttp",
                url: tablink
            }, function (response) {
                loadPage(response);
            });
        } else if (collection.parseProfileData) {
            chrome.tabs.executeScript(null, {
                file: "getPagesSource.js"
            }, function () {
                if (chrome.runtime.lastError) {
                    setMessage(errormsg, 'There was an error injecting script : \n' + chrome.runtime.lastError.message);
                }
            });
        }
    } else {
        setTimeout(getPageCode, 200);
    }
}

var loginprocessing = true;
var logincount = 0;
function loadLogin() {
    chrome.runtime.sendMessage({
        method: "GET",
        action: "xhttp",
        url: smartcopyurl + "/accountlogin?version=" + chrome.runtime.getManifest().version
    }, function (responseText) {
        try {
            var response = JSON.parse(responseText.source);
        } catch(err) {
            console.log('Problem getting account information.');
            if (loginprocessing) {
                console.log("Logged Out... Redirecting to Geni for authorization.");
                loginprocessing = false;
                var frame = $("#loginframe");
                frame.attr('src', smartcopyurl + '/smartlogin');
                $("body").css('max-width', "640px");
                $("body").animate({ 'width': "640px" }, 'slow');
                frame.load(function(){
                    if (logincount > 0) {
                        loginProcess();
                    } else if (logincount === 0) {
                        $("#logindiv").slideDown();
                        document.getElementById("loginspinner").style.display = "none";
                    }
                    logincount++;
                });
            }
            return;
        }

        console.log("Logged In...");
        accountinfo = response;
        if (accountinfo.curator) {
            //display leaderboard link if user is a curator - page itself still verifies
            document.getElementById("curator").style.display = "inline-block";
        }
        loggedin = true;
        if (!loginprocessing) {
            $("#logindiv").slideUp();
            document.getElementById("loginspinner").style.display = "block";
            if (!slideopen) {
                $("body").animate({ 'max-width': "340px" }, 'slow');
                $("body").animate({ 'width': "340px" }, 'slow');
                $("configtext").hide();
            } else {
                $("body").animate({ 'max-width': "500px" }, 'slow');
                $("body").animate({ 'width': "500px" }, 'slow');
                $("configtext").show();
            }
        }
        loginProcess();
    });
}

function getProfile(profile_id) {
    //Gets the profile id from the Geni URL
    if (profile_id.length > 0) {
        var startid = profile_id.toLowerCase();
        profile_id = decodeURIComponent(profile_id).trim();
        if (profile_id.indexOf("&resolve=") != -1) {
            profile_id = profile_id.substring(profile_id.lastIndexOf('#') + 1);
        }
        if (profile_id.indexOf("profile-") != -1) {
            profile_id = profile_id.substring(profile_id.lastIndexOf('/') + 1);
        }
        if (profile_id.indexOf("#/tab") != -1) {
            profile_id = profile_id.substring(0, profile_id.lastIndexOf('#/tab'));
        }
        if (profile_id.indexOf("/") != -1) {
            //Grab the GUID from a URL
            profile_id = profile_id.substring(profile_id.lastIndexOf('/') + 1);
        }
        if (profile_id.indexOf("?through") != -1) {
            //In case the copy the profile url by navigating through another 6000000002107278790?through=6000000010985379345
            //But skip 6000000029660962822?highlight_id=6000000029660962822#6000000028974729472
            profile_id = "profile-g" + profile_id.substring(0, profile_id.lastIndexOf('?'));
        }
        if (profile_id.indexOf("?from_flash") != -1) {
            profile_id = "profile-g" + profile_id.substring(0, profile_id.lastIndexOf('?'));
        }
        if (profile_id.indexOf("?highlight_id") != -1) {
            profile_id = "profile-g" + profile_id.substring(profile_id.lastIndexOf('=') + 1, profile_id.length);
        }
        if (profile_id.indexOf("#") != -1) {
            //In case the copy the profile url by navigating in tree view 6000000001495436722#6000000010985379345
            if (profile_id.contains("html5")) {
                profile_id = "profile-" + profile_id.substring(profile_id.lastIndexOf('#') + 1, profile_id.length);
            } else {
                profile_id = "profile-g" + profile_id.substring(profile_id.lastIndexOf('#') + 1, profile_id.length);
            }
        }
        var isnum = /^\d+$/.test(profile_id);
        if (isnum) {
            if (profile_id.length > 16) {
                profile_id = "profile-g" + profile_id;
            } else if (startid.contains("www.geni.com/people") || startid.contains("www.geni.com/family-tree")) {
                profile_id = "profile-g" + profile_id;
            } else {
                profile_id = "profile-" + profile_id;
            }
        }
        var validate = profile_id.replace("profile-g", "").replace("profile-", "");
        if (isNaN(validate)) {
            profile_id = "";
        }
        if (profile_id.indexOf("profile-") != -1 && profile_id !== "profile-g") {
            return "?profile=" + profile_id;
        } else {
            console.log("Profile ID not detected: " + startid);
            console.log("URL: " + tablink);
            return "";
        }
    }
    return "";
}

var exlinks = document.getElementsByClassName("expandlinks");

var expandAll = function () {
    var expandmembers = $(this).closest('div').find('.memberexpand');
    for (var i = 0; i < expandmembers.length; i++) {
        if (!exists(window[this.name])) {
            window[this.name] = true;
        }
        if (window[this.name]) {
            $(expandmembers[i]).slideDown();
            this.innerText = "collapse all";
        } else {
            $(expandmembers[i]).slideUp();
            this.innerText = "expand all";
        }
    }
    window[this.name] = !window[this.name];
};

for (var i = 0; i < exlinks.length; i++) {
    exlinks[i].addEventListener('click', expandAll, false);
}

function expandFamily(member) {
    $('#slide' + member).slideToggle();
}

var entityMap = {
    "& ": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;',
    "`": '&DiacriticalGrave;'
};

function escapeHtml(string) {
    return String(string).replace(/& |[<>"'`\/]/g, function (s) {
        return entityMap[s];
    });
}

function capFL(string) {   //Capitalize the first letter of the string
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function exists(object) {
    return (typeof object !== "undefined" && object !== null);
}

$(function () {
    $('.checkall').on('click', function () {
        var fs = $(this).closest('div').find('fieldset');
        var ffs = fs.find('[type="checkbox"]');
        var photoon = $('#photoonoffswitch').prop('checked');
        ffs.filter(function (item) {
            if ($(ffs[item]).closest('tr').css("display") === "none") {
                return false;
            }
            return !(!photoon && $(ffs[item]).hasClass("photocheck") && !this.checked);
        }).prop('checked', this.checked);
        var ffs = fs.find('input[type="text"],select,input[type="hidden"],textarea').not(".genislideinput").not(".parentselector");
        ffs.filter(function (item) {
            return !((ffs[item].type === "checkbox") || ($(ffs[item]).closest('tr').css("display") === "none") || (!photoon && $(ffs[item]).hasClass("photocheck") && !this.checked) || ffs[item].name === "action" || ffs[item].name === "profile_id");
        }).attr('disabled', !this.checked);
    });
});

$(function () {
    $('#updateslide').on('click', function () {
        $('#profilefield').slideToggle();
    });
});

var showhistorycheck = true;
$(function () {
    $('#showhistory').on('click', function () {
        $('#historybox').slideToggle();
        showhistorycheck = !showhistorycheck;
        if (showhistorycheck) {
            document.getElementById('showhistory').innerText = "Show History";
        } else {
            document.getElementById('showhistory').innerText = "Hide History";
        }
    });
});

$(function () {
    $('#addhistory').on('click', function () {
        addHistory(focusid, tablink, focusname, "");
        buildHistoryBox();
    });
});

$(function () {
    $('#clearhistory').on('click', function () {
        buildhistory = [];
        chrome.storage.local.set({'buildhistory': buildhistory});
        buildHistoryBox();
    });
});

// ------------------ Form submission ---------------
var submitstatus = [];
var tempspouse = [];
var spouselist = [];
var parentlist = [];
var addchildren = [];
var photosubmit = [];
var focusphotoinfo = null;
var submitform = function () {
    if (parsecomplete && submitcheck) {
        document.getElementById("bottomsubmit").style.display = "none";
        document.getElementById("submitbutton").style.display = "none";
        submitcheck = false; //try to prevent clicking more than once and submitting it twice
        document.getElementById("familydata").style.display = "none";
        document.getElementById("profiledata").style.display = "none";
        document.getElementById("updating").style.display = "block";
        setMessage(warningmsg, 'Leaving this window before completion could result in an incomplete data copy.');

        var about = "";
        var sourcecheck = $('#sourceonoffswitch').prop('checked');
        var fs = $('#profiletable');
        var profileout = parseForm(fs);
        var profileupdatestatus = "";
        // --------------------- Update Profile Data ---------------------
        if (!$.isEmptyObject(profileout)) {
            document.getElementById("updatestatus").innerText = "Update: " + focusname;
            if (exists(profileout["about_me"])) {
                about = profileout["about_me"];
                if (!about.endsWith("\n")) {
                    about += "\n";
                }
            }
            if (sourcecheck) {
                var refurl = tablink;
                if (exists(alldata["profile"].url)) {
                    refurl = alldata["profile"].url;
                }
                if (!focusabout.contains("Updated from [" + encodeURI(refurl) + " " + recordtype + "] by [http://www.geni.com/projects/SmartCopy/18783 SmartCopy]:") &&
                    !focusabout.contains("Updated from [" + encodeURI(refurl) + " " + recordtype + "] by [https://www.geni.com/projects/SmartCopy/18783 SmartCopy]:") &&
                    !focusabout.contains("Reference: [" + encodeURI(refurl) + " " + recordtype + "] - [http://www.geni.com/projects/SmartCopy/18783 SmartCopy]:")) {
                    if (focusabout !== "") {
                        about = focusabout + "\n" + about;
                    }
                    if (about !== "") {
                        var splitabout = about.split("\n");
                        if (splitabout.length > 1 && splitabout[splitabout.length - 2].startsWith("* ")) {
                            if (!about.endsWith("\n")) {
                                about += "\n";
                            }
                            about += "*";
                        }
                    }
                    profileout["about_me"] = about + "* Reference: [" + encodeURI(refurl) + " " + recordtype + "] - [http://www.geni.com/projects/SmartCopy/18783 SmartCopy]: ''" + moment.utc().format("MMM D YYYY, H:mm:ss") + " UTC''\n";
                } else {
                    if (about !== "") {
                        profileout["about_me"] = focusabout + "\n" + about;
                    }
                }
            } else if (about !== "" && focusabout !== "") {
                profileout["about_me"] = focusabout + "\n" + about;
            }
            if (exists(profileout["nicknames"]) && focusnicknames !== "") {
                profileout["nicknames"] = focusnicknames + "," + profileout["nicknames"];
            }
            if (exists(profileout.photo)) {
                if (tablink.indexOf('showRecord') !== -1) {
                    var shorturl = tablink.substring(0, tablink.indexOf('showRecord') + 10);
                } else {
                    var shorturl = tablink;
                }
                var description = "";
                if (exists(profileout.author) && profileout.author !== "") {
                    description = profileout.author + ", ";
                }
                focusphotoinfo = {photo: profileout.photo, title: focusname, attribution: description + "Source: " + shorturl};
                delete profileout.photo;
                delete profileout.author;
            }
            buildTree(profileout, "update", focusid);
            document.getElementById("updatestatus").innerText = "Updating Profile";
            profileupdatestatus = "Updating Profile & ";
        }

        // --------------------- Add Family Data ---------------------
        var privateprofiles = $('.checkslide');
        for (var profile in privateprofiles) if (privateprofiles.hasOwnProperty(profile)) {
            var entry = privateprofiles[profile];
            if (exists(entry.name) && entry.name.startsWith("checkbox") && entry.checked) {
                fs = $("#" + entry.name.replace("checkbox", "slide"));

                var actionname = entry.name.split("-"); //get the relationship
                if (actionname[1] === "unknown") {
                    continue;
                }
                var familyout = parseForm(fs);
                var tempfamilyout = jQuery.extend(true, {}, familyout);
                delete tempfamilyout.profile_id;  //check to see if it's only the hidden profile_id
                if (!$.isEmptyObject(tempfamilyout)) {
                    var fdata = databyid[familyout.profile_id];
                    if (exists(fdata)) {
                        about = "";
                        if (exists(familyout["about_me"])) {
                            about = familyout["about_me"];
                        }
                        if (about !== "") {
                            var splitabout = about.split("\n");
                            if (splitabout.length > 1 && splitabout[splitabout.length - 2].startsWith("* ")) {
                                if (!about.endsWith("\n")) {
                                    about += "\n";
                                }
                                about += "*";
                            }
                        }
                        if (sourcecheck) {
                            var focusprofileurl = "";
                            if (focusid.startsWith("profile-g")) {
                                focusprofileurl = "http://www.geni.com/profile/index/" + focusid.replace("profile-g", "");
                            } else {
                                focusprofileurl = "http://www.geni.com/" + focusid;
                            }
                            about = about + "* Reference: [" + encodeURI(fdata.url) + " " + recordtype + "] - [http://www.geni.com/projects/SmartCopy/18783 SmartCopy]: ''" + moment.utc().format("MMM D YYYY, H:mm:ss") + " UTC''\n";
                        }
                        if (about !== "") {
                            familyout["about_me"] = about;
                        }
                    }
                    if (exists(familyout.photo)) {
                        if (fdata.url.indexOf('showRecord') !== -1) {
                            var shorturl = fdata.url.substring(0, fdata.url.indexOf('showRecord') + 10);
                        } else {
                            var shorturl = fdata.url;
                        }
                        var description = "";
                        if (exists(familyout.author) && familyout.author !== "") {
                            description = familyout.author + ", ";
                        }
                        photosubmit[familyout.profile_id] = {photo: familyout.photo, title: fdata.name, attribution: description + "Source: " + shorturl};
                        delete familyout.photo;
                        delete familyout.author;
                    }
                    if (familyout.action === "add") {
                        delete familyout.action;
                        if (actionname[1] !== "child") {
                            var statusaction = actionname[1];
                            if (statusaction === "sibling" || statusaction === "parent" || statusaction === "partner") {
                                statusaction += "s";
                            }
                            document.getElementById("updatestatus").innerText = profileupdatestatus + "Submitting Family (Siblings/Parents)";
                            if (parentblock && statusaction === "parents") {
                                parentspouselist.push(familyout);
                            } else {
                                buildTree(familyout, "add-" + actionname[1], focusid);
                                if (statusaction === "parents") {
                                    parentblock = true;
                                }
                            }
                        } else {
                            addchildren[familyout.profile_id] = familyout;
                        }
                    } else {
                        document.getElementById("updatestatus").innerText = profileupdatestatus + "Submitting Family (Siblings/Parents)";
                        var pid = familyout.action;
                        delete familyout.action;
                        if (exists(fdata)) {
                            databyid[familyout.profile_id]["geni_id"] = pid;
                        }
                        var genidata;
                        if (exists(genifamilydata[pid])) {
                            genidata = genifamilydata[pid];
                        }
                        if (isPartner(actionname[1]) || isParent(actionname[1])) {
                            var unionid = getUnion(pid);
                            if (unionid !== "") {
                                spouselist[familyout.profile_id] = {union: unionid, status: "", genidata: genidata};
                            }
                        }
                        if ((exists(familyout["about_me"]) && familyout["about_me"] !== "") || (exists(familyout["nicknames"]) && familyout["nicknames"] !== "")) {
                            var abouturl = smartcopyurl + "/smartsubmit?fields=about_me,nicknames&profile=" + pid;
                            submitstatus.push(updatetotal);
                            chrome.runtime.sendMessage({
                                method: "GET",
                                action: "xhttp",
                                url: abouturl,
                                variable: {pid: pid, familyout: familyout}
                            }, function (response) {
                                var geni_return = JSON.parse(response.source);
                                var familyout = response.variable.familyout;
                                if (!$.isEmptyObject(geni_return)) {
                                    if (exists(familyout["about_me"]) && exists(geni_return.about_me)) {
                                        familyout["about_me"] = geni_return.about_me + "\n" + familyout["about_me"];
                                    }
                                    if (exists(familyout["nicknames"]) && exists(geni_return.nicknames)) {
                                        familyout["nicknames"] = geni_return.nicknames + "," + familyout["nicknames"];
                                    }
                                }
                                buildTree(familyout, "update", response.variable.pid);
                                submitstatus.pop();
                            });
                        } else {
                            buildTree(familyout, "update", pid);
                        }
                    }
                }
            }
        }
    }

    submitChildren();
};

function getUnion(profileid) {
    for (var i=0; i < genifamily.length; i++) {
        if (genifamily[i].id === profileid) {
            return genifamily[i].union;
        }
    }
    return "";
}

var noerror = true;
function buildTree(data, action, sendid) {
    if (!$.isEmptyObject(data) && exists(sendid) && !devblocksend) {
        if (action !== "add-photo" && action !== "delete") {
            updatetotal += 1;
            document.getElementById("updatetotal").innerText = updatetotal;
            document.getElementById("updatecount").innerText = Math.min(updatecount, updatetotal).toString();
        }
        submitstatus.push(updatetotal);
        var id = "";
        if (exists(data.profile_id)) {
            id = data.profile_id;
            delete data.profile_id;
        }
        var permissions = [];
        if (exists(genifamilydata[sendid])) {
            permissions = genifamilydata[sendid].get("actions");
        } else if (genifocusdata.get("id") === sendid || sendid.startsWith("union")) {
            permissions = genifocusdata.get("actions");
        }
        if (action === "update") {
            if (permissions.indexOf("update") === -1 && permissions.indexOf("update-basics") !== -1) {
                action = "update-basics";
            }
        } else if (action.startsWith("add") && action !== "add-photo") {
            if (permissions.indexOf("add") === -1) {
                setMessage(errormsg, "Permission denied - No add permission on: " + sendid);
                console.log("Permission denied - No add permission on profile: " + sendid);
                return;
            }
        }
        chrome.runtime.sendMessage({
            method: "POST",
            action: "xhttp",
            url: smartcopyurl + "/smartsubmit?profile=" + sendid + "&action=" + action,
            data: $.param(data),
            variable: {id: id, relation: action.replace("add-", ""), data: data}
        }, function (response) {
            try {
                var result = JSON.parse(response.source);
            } catch (e) {
                noerror = false;
                var extrainfo = "";
                if (response.variable.relation === "photo") {
                    extrainfo = "The photo may be too large. "
                }
                setMessage(errormsg, 'There was a problem adding a ' + response.variable.relation + ' to Geni. ' + extrainfo + 'Error Response: "' + e.message + '"');
                console.log(e); //error in the above string(in this case,yes)!
                console.log(response.source);
            }
            var id = response.variable.id;
            if (exists(databyid[id])) {
                var genidata;
                if (exists(result.id)) {
                    databyid[id]["geni_id"] = result.id;
                }
                if (exists(genifamilydata[databyid[id]["geni_id"]])) {
                    genidata = genifamilydata[databyid[id]["geni_id"]];
                }
                if (response.variable.relation === "partner" && exists(result.unions)) {
                    spouselist[id] = {union: result.unions[0].replace("https://www.geni.com/api/", ""), status: databyid[id].status, genidata: genidata};
                } else if (response.variable.relation === "parent" && exists(result.unions)) {
                    parentspouseunion = result.unions[0].replace("https://www.geni.com/api/", "");
                    if (parentlist.length > 0) {
                        if (exists(parentlist[0].id) && (exists(marriagedates[id]) || exists(marriagedates[parentlist[0].id]))) {
                            if (exists(marriagedates[id])) {
                                var pid = id;
                            } else {
                                var pid = parentlist[0].id;
                            }
                            if (action !== "add-photo" && action !== "delete") {
                                updatetotal += 1;
                                document.getElementById("updatetotal").innerText = updatetotal;
                            }
                            submitstatus.push(updatetotal);
                            var source = JSON.parse(response.source);
                            var familyurl = smartcopyurl + "/smartsubmit?family=spouse&profile=" + source.id;
                            chrome.runtime.sendMessage({
                                method: "GET",
                                action: "xhttp",
                                variable: {id: pid},
                                url: familyurl
                            }, function (response) {
                                var source2 = JSON.parse(response.source);
                                var rid = response.variable.id;
                                var genidata;
                                if (exists(genifamilydata[source2.id])) {
                                    genidata = genifamilydata[source2.id];
                                }
                                if (exists(source2[0]) && exists(source2[0].union)) {
                                    spouselist[rid] = {union: source2[0].union, status: databyid[rid].mstatus, genidata: genidata};
                                }
                                if (action !== "add-photo" && action !== "delete") {
                                    updatecount += 1;
                                    document.getElementById("updatecount").innerText = Math.min(updatecount, updatetotal).toString();
                                }
                                submitstatus.pop();
                            });
                        }
                    } else {
                        parentlist.push({id: id, status: databyid[id].mstatus});
                    }
                }
                addHistory(result.id, databyid[id].itemId, databyid[id].name, JSON.stringify(response.variable.data));
            }
            if (action !== "add-photo" && action !== "delete") {
                updatecount += 1;
                document.getElementById("updatecount").innerText = Math.min(updatecount, updatetotal).toString();
            }
            submitstatus.pop();
        });
    } else if (!$.isEmptyObject(data) && exists(sendid) && devblocksend) {
        var permissions = [];
        if (exists(genifamilydata[sendid])) {
            permissions = genifamilydata[sendid].get("actions");
        } else if (genifocusdata.get("id") === sendid || sendid.startsWith("union")) {
            permissions = genifocusdata.get("actions");
        }
        if (action === "update") {
            if (permissions.indexOf("update") === -1 && permissions.indexOf("update-basics") !== -1) {
                action = "update-basics";
            }
        } else if (action.startsWith("add") && action !== "add-photo") {
            if (permissions.indexOf("add") === -1) {
                setMessage(errormsg, "Permission denied - No add permission on: " + sendid);
                console.log("Permission denied - No add permission on profile: " + sendid);
                return;
            }
        }
        if (exists(data.profile_id)) {
            var id = data.profile_id;
            if (exists(databyid[id])) {
                databyid[id]["geni_id"] = sendid;
                var genidata;
                if (exists(genifamilydata[sendid])) {
                    genidata = genifamilydata[sendid];
                }
                spouselist[id] = {union: "union" + id, status: databyid[id].status, genidata: genidata};
                if (parentlist.length > 0) {
                    if (exists(marriagedates[id])) {
                        spouselist[id] = {union: "union" + id, status: databyid[id].mstatus, genidata: genidata};
                    } else if (exists(marriagedates[parentlist[0].id])) {
                        var pid = parentlist[0];
                        spouselist[pid.id] = {union: "union" + pid.id, status: pid.mstatus, genidata: genidata};
                    } else {
                        console.log("No Parent");
                    }
                    console.log("Add Union: " + JSON.stringify(spouselist[id]));
                } else {
                    parentlist.push({id: id, status: databyid[id].mstatus});
                }
            }
            delete data.profile_id;
        }
        console.log("-------------------");
        console.log("Action: " + action + " on " + sendid);
        console.log(JSON.stringify(data));
    }
}

var checkchildren = false;
var checkpictures = false;
var checkspouseunion = false;
var photocount = 0;
var photototal = 0;
var photoprogress = 0;
function submitChildren() {
    if (submitstatus.length > 0) {
        setTimeout(submitChildren, 200);
    } else if (!checkspouseunion) {
        checkspouseunion = true;
        if (parentspouselist.length > 0 && exists(parentspouseunion)) {
            for (var i = 0; parentspouselist.length > i; i++) {
                buildTree(parentspouselist[i], "add-partner", parentspouseunion);
            }
        }
        submitChildren();
    } else if (!checkchildren) {
        checkchildren = true;
        updatecount = 1;
        updatetotal = 0;
        if (spouselist.length > 0) {
            document.getElementById("updatestatus").innerText = "Adding Spouse(s)";
        }
        var tempadded = [];
        for (var i = 0; i < addchildren.length; i++) {
            if (exists(addchildren[i])) {
                var childid = childlist[i];
                if (!exists(childid) || childid === -1) {
                    childid = 0;
                } else if (childid.startsWith("union")) {
                    continue;
                }
                if (!exists(tempadded[childid]) && !exists(spouselist[childid])) {
                    //Add a temp for each spouse which is a parent that is not added
                    buildTempSpouse(childid);
                    tempadded[childid] = "added";
                }
            }
        }
        for (var i = 0; i < spouselist.length; i++) {
            if (exists(spouselist[i])) {
                var spouseinfo = spouselist[i];
                var genidata = spouseinfo.genidata;
                var genimarriage;
                var genidivorce;
                var genistatus = "spouse";
                if (exists(genidata) && exists(genidata.person)) {
                    genistatus = genidata.get("status");
                    genimarriage = genidata.person.marriage;
                    genidivorce = genidata.person.divorce;
                }

                var marriageupdate = {};
                var status = "";

                if (spouseinfo.status === ("ex-partner")) {
                    status = "ex_partner";
                } else if (spouseinfo.status === "ex-spouse") {
                    status = "ex_spouse";
                } else if (spouseinfo.status === "partner") {
                    status = "partner";
                }
                if (status !== "") {
                    marriageupdate.status = status;
                }
                if (exists(marriagedates[i])) {
                    if (exists(marriagedates[i].marriage) && (!emptyEvent(marriagedates[i].marriage) || !emptyEvent(genimarriage))) {
                        if (status === "spouse" && genistatus !== "spouse") {
                            marriageupdate.status = genistatus;
                        }
                        marriageupdate.marriage = marriagedates[i].marriage;
                    }
                    if (exists(marriagedates[i].divorce) && (!emptyEvent(marriagedates[i].divorce) || !emptyEvent(genidivorce))) {
                        if (status === "spouse" && genistatus !== "spouse") {
                            marriageupdate.status = genistatus;
                        }
                        marriageupdate.divorce = marriagedates[i].divorce;
                    }
                }
                if (!$.isEmptyObject(marriageupdate) && !devblocksend) {
                    chrome.runtime.sendMessage({
                        method: "POST",
                        action: "xhttp",
                        url: smartcopyurl + "/smartsubmit?profile=" + spouseinfo.union + "&action=update",
                        data: $.param(marriageupdate),
                        variable: ""
                    }, function (response) {
                    });
                    //Process the Union Update
                } else if (!$.isEmptyObject(marriageupdate) && devblocksend) {
                    console.log("Marriage Update: " + JSON.stringify(marriageupdate));
                }
            }
        }
        submitChildren();
    } else if (!checkpictures) {
        checkpictures = true;
        updatecount = 1;
        updatetotal = 0;
        if (addchildren.length > 0) {
            document.getElementById("updatestatus").innerText = "Adding Children";
        }
        // --------------------- Add Child Data ---------------------
        for (var child in addchildren) if (addchildren.hasOwnProperty(child)) {
            var familyout = addchildren[child];
            var clid = childlist[familyout.profile_id];
            var parentunion;
            if (!exists(clid) || clid === -1) {
                parentunion = spouselist[0].union;
            } else if (clid.startsWith("union")) {
                parentunion = clid;
            } else {
                parentunion = spouselist[clid].union;
            }
            if (exists(parentunion)) {
                buildTree(familyout, "add-child", parentunion);
            }
        }
        if (exists(focusphotoinfo) || photosubmit.length > 0) {
            if (exists(focusphotoinfo)) {
                photototal += 1;
            }
            for (var p = 0; p < photosubmit.length; p++) {
                if (exists(photosubmit[p]) && exists(databyid[p])) {
                    photototal += 1;
                }
            }
            photoprogress = photototal;
        }
        submitChildren();
    } else if (exists(focusphotoinfo) || photoprogress > 0) {
        photocount += 1;
        var photodialog = "1 Photo";
        if (photototal > 1) {
            photodialog = photototal + " Photos";
        }
        document.getElementById("updatestatus").innerText = "Queuing " + photodialog;
        document.getElementById("updatetotal").innerText = photototal;
        document.getElementById("updatecount").innerText = Math.min(photocount, photototal).toString();
        if (exists(focusphotoinfo)) {
            buildTree(focusphotoinfo, "add-photo", focusid);
            focusphotoinfo = null;
            photoprogress -= 1;
        } else {
            for (var p = 0; p < photosubmit.length; p++) {
                if (exists(photosubmit[p]) && exists(databyid[p])) {
                    buildTree(photosubmit[p], "add-photo", databyid[p].geni_id);
                    photosubmit[p] = null;
                    photoprogress -= 1;
                    break;
                }
            }
        }
        submitChildren();
    } else {
        submitWait();
    }
}

function buildTempSpouse(parentid) {
    var tgender = reverseGender(focusgender);
    if (!devblocksend) {
        submitstatus.push(submitstatus.length);
        chrome.runtime.sendMessage({
            method: "POST",
            action: "xhttp",
            url: smartcopyurl + "/smartsubmit?profile=" + focusid + "&action=add-partner",
            data: $.param({gender: tgender}),
            variable: {id: parentid}
        }, function (response) {
            var result = JSON.parse(response.source);
            if (exists(result.unions)) {
                spouselist[response.variable.id] = {union: result.unions[0].replace("https://www.geni.com/api/", ""), status: "partner", genidata: ""};
            }
            tempspouse[response.variable.id] = result.id;
            submitstatus.pop();
        });
    } else if (devblocksend) {
        //Dev testing code - give it some fake data so it doesn't fail
        spouselist[parentid] = {union: "union-58259268", status: "partner", genidata: ""};
    }
}

function submitWait() {
    if (submitstatus.length > 0) {
        setTimeout(submitWait, 200);
    } else {
        for (var i = 0; i < tempspouse.length; i++) {
            if (exists(tempspouse[i])) {
                buildTree("", "delete", tempspouse[i]);
            }
        }
        var focusprofileurl = "";
        if (focusid.startsWith("profile-g")) {
            focusprofileurl = "http://www.geni.com/profile/index/" + focusid.replace("profile-g", "");
        } else {
            focusprofileurl = "http://www.geni.com/" + focusid;
        }
        $("#updating").html('<div style="text-align: center; font-size: 110%;"><strong>Geni Tree Updated</strong></div>' +
            '<div style="text-align: center; padding:5px; color: #a75ccd">Reminder: Please review for duplicates<br>and merge when able.</div>' +
            '<div style="text-align: center; padding:5px;"><b>View Profile:</b> ' +
            '<a href="http://www.geni.com/family-tree/index/' + focusid.replace("profile-g", "") + '" target="_blank">tree view</a>, ' +
            '<a href="' + focusprofileurl + '" target="_blank">profile view</a></div>');
        if (noerror) {
            document.getElementById("message").style.display = "none";
            $('#updating').css('margin-bottom', "15px");
        }
        buildHistoryBox();
        console.log("Tree Updated...");
        if (devblocksend) {
            console.log("******** Dev Mode - Blocked Sending ********")
        }
    }
}

var slideoptions = function () {
    $('#optionslide').slideToggle();
};

document.getElementById('submitbutton').addEventListener('click', submitform, false);
document.getElementById('submitbutton2').addEventListener('click', submitform, false);
document.getElementById('optionbutton').addEventListener('click', slideoptions, false);


function parseForm(fs) {
    var objentry = {};
    var marentry = {};
    var diventry = {};
    var rawinput = fs.find('input[type="text"],select,input[type="hidden"],textarea').not(".genislideinput");
    var updatefd = (fs.selector === "#profiletable");
    var fsinput = rawinput.filter(function (item) {
        return (!$(rawinput[item]).closest('tr').hasClass("geohidden"));
    });
    for (var item in fsinput) if (fsinput.hasOwnProperty(item)) {
        if (exists(fsinput[item].value) && !fsinput[item].disabled && fsinput[item].name !== "") {
            //console.log(fsinput[item].name + ":" + fsinput[item].value);
            var splitentry = fsinput[item].name.split(":");
            if (splitentry.length > 1) {
                if (splitentry[1] === "date") {
                    var vardate = parseDate(fsinput[item].value, updatefd);

                    if (!$.isEmptyObject(vardate)) {
                        var finalentry = {};
                        finalentry[splitentry[1]] = vardate;
                        if (splitentry[0] === "divorce") {
                            if (!exists(diventry[splitentry[0]])) {
                                diventry[splitentry[0]] = {};
                            }
                            $.extend(diventry[splitentry[0]], finalentry);
                        } else if (splitentry[0] !== "marriage") {
                            if (!exists(objentry[splitentry[0]])) {
                                objentry[splitentry[0]] = {};
                            }
                            $.extend(objentry[splitentry[0]], finalentry);
                        } else {
                            if (!exists(marentry[splitentry[0]])) {
                                marentry[splitentry[0]] = {};
                            }
                            $.extend(marentry[splitentry[0]], finalentry);
                        }
                    }
                } else if (splitentry[1] === "location" && splitentry.length > 2) {
                    if (fsinput[item].value !== "" || updatefd) {
                        var varlocation = {};
                        var fieldname = splitentry[2];
                        if (fieldname === "place_name_geo") {
                            fieldname = "place_name";
                        }
                        varlocation[fieldname] = fsinput[item].value;

                        if (splitentry[0] === "divorce") {
                            if (!exists(diventry[splitentry[0]])) {
                                diventry[splitentry[0]] = {};
                            }
                            if (!exists(diventry[splitentry[0]][splitentry[1]])) {
                                diventry[splitentry[0]][splitentry[1]] = {};
                            }
                            $.extend(diventry[splitentry[0]][splitentry[1]], varlocation);
                        } else if (splitentry[0] !== "marriage") {
                            if (!exists(objentry[splitentry[0]])) {
                                objentry[splitentry[0]] = {};
                            }
                            if (!exists(objentry[splitentry[0]][splitentry[1]])) {
                                objentry[splitentry[0]][splitentry[1]] = {};
                            }
                            $.extend(objentry[splitentry[0]][splitentry[1]], varlocation);
                        } else {
                            if (!exists(marentry[splitentry[0]])) {
                                marentry[splitentry[0]] = {};
                            }
                            if (!exists(marentry[splitentry[0]][splitentry[1]])) {
                                marentry[splitentry[0]][splitentry[1]] = {};
                            }
                            $.extend(marentry[splitentry[0]][splitentry[1]], varlocation);
                        }
                    }
                }
            } else {
                if (fsinput[item].name === "action") {
                    updatefd = (fsinput[item].value !== "add");
                    objentry[fsinput[item].name] = fsinput[item].options[fsinput[item].selectedIndex].value;
                } else if (fsinput[item].name === "gender") {
                    if (exists(fsinput[item].options[fsinput[item].selectedIndex])) {
                        objentry[fsinput[item].name] = fsinput[item].options[fsinput[item].selectedIndex].value;
                    }
                } else if (fsinput[item].name === "parent") {
                    if (exists(fsinput[item].options[fsinput[item].selectedIndex])) {
                        childlist[objentry.profile_id] = fsinput[item].options[fsinput[item].selectedIndex].value;
                    }
                } else if (fsinput[item].value !== "" || updatefd) {
                    objentry[fsinput[item].name] = fsinput[item].value;
                    if (fsinput[item].name === "photo" && $(fsinput[item]).attr("author")) {
                        objentry["author"] = $(fsinput[item]).attr("author");
                    }
                }
            }
        }
        //var entry = focusprofile[profile];
        //console.log(entry);
    }
    if (!$.isEmptyObject(marentry) || !$.isEmptyObject(diventry)) {
        if (!$.isEmptyObject(marentry) && !$.isEmptyObject(diventry)) {
            marentry["divorce"] = diventry["divorce"];
        } else if (!$.isEmptyObject(diventry)) {
            marentry = diventry;
        }
        marriagedates[objentry.profile_id] = marentry;
    }
    return objentry;
}

function parseDate(fulldate, update) {
    var vardate = {};
    if (update) {
        vardate["circa"] = false;
        vardate["range"] = "";
        vardate["day"] = "";
        vardate["month"] = "";
        vardate["year"] = "";
        vardate["end_circa"] = "";
        vardate["end_day"] = "";
        vardate["end_month"] = "";
        vardate["end_year"] = "";
    }

    if (fulldate.startsWith("Circa")) {
        vardate["circa"] = true;
        fulldate = fulldate.replace("Circa ", "");
    }
    if (fulldate.startsWith("After")) {
        vardate["range"] = "after";
        fulldate = fulldate.replace("After ", "");
        if (fulldate.startsWith("Circa")) {
            vardate["circa"] = true;
            fulldate = fulldate.replace("Circa ", "");
        }
    } else if (fulldate.startsWith("Before")) {
        vardate["range"] = "before";
        fulldate = fulldate.replace("Before ", "");
        if (fulldate.startsWith("Circa")) {
            vardate["circa"] = true;
            fulldate = fulldate.replace("Circa ", "");
        }
    } else if (fulldate.startsWith("Between")) {
        vardate["range"] = "between";
        fulldate = fulldate.replace("Between ", "");
        if (fulldate.startsWith("Circa")) {
            vardate["circa"] = true;
            fulldate = fulldate.replace("Circa ", "");
        }
        var btsplit = fulldate.split(" and ");
        if (btsplit.length > 1) {
            fulldate = btsplit[0];
            if (btsplit[1].startsWith("Circa ")) {
                vardate["end_circa"] = true;
                btsplit[1] = btsplit[1].replace("Circa ", "").trim();
            }
            var dt = moment(btsplit[1].trim(), getDateFormat(btsplit[1].trim()));
            if (isNaN(btsplit[1])) {
                var splitd = btsplit[1].split(" ");
                if (splitd.length > 2) {
                    vardate["end_day"] = dt.get('date');
                    vardate["end_month"] = dt.get('month') + 1; //+1 because, for some dumb reason, months are indexed to 0
                } else {
                    vardate["end_month"] = dt.get('month') + 1; //+1 because, for some dumb reason, months are indexed to 0
                }
            }
            if (dt.get('year') !== 0) {
                vardate["end_year"] = dt.get('year');
            }
        }
    }
    var dt = moment(fulldate.trim(), getDateFormat(fulldate.trim()));
    //TODO Probably need to do some more checking below to make sure it doesn't improperly default dates
    if (isNaN(fulldate)) {
        var splitd = [];
        if (fulldate.contains("-")) {
            splitd = fulldate.split("-");
        } else {
            splitd= fulldate.split(" ");
        }
        if (splitd.length > 2) {
            vardate["day"] = dt.get('date');
            vardate["month"] = dt.get('month') + 1; //+1 because, for some dumb reason, months are indexed to 0
        } else {
            vardate["month"] = dt.get('month') + 1; //+1 because, for some dumb reason, months are indexed to 0
        }
    }
    if (dt.get('year') !== 0) {
        vardate["year"] = dt.get('year');
    }
    return vardate;
}

function getDateFormat(valdate) {
    var dateformat = dateformatter;
    if (exists(valdate)) {
        if (valdate.trim().search(/\d{4}-\d{2}/) !== -1) {
            dateformat = "YYYY-MM-DD";
        } else if ((valdate.trim().search(/\d{2}-\d{4}/) !== -1) || (valdate.trim().search(/\d{1}-\d{1}-\d{4}/) !== -1)) {
            var datesplit = valdate.split("-");
            //assume a MM-DD-YYYY format
            if (parseInt(datesplit[0]) > 12) {
                dateformat = "DD-MM-YYYY";
            } else {
                dateformat = "MM-DD-YYYY";
            }
        }
    }
    return dateformat;
}

function dateAmbigous(valdate) {
    if (getDateFormat(valdate) === "MM-DD-YYYY") {
        var datesplit = valdate.split("-");
        if (parseInt(datesplit[1]) < 13) {
            return true;
        }
    }
    return false;
}

function addHistory(id, itemId, name, data) {
    if (exists(id)) {
        buildhistory.unshift({id: id, itemId: itemId, name: name, date: Date.now(), data: data});
        if (buildhistory.length > 100) {
            buildhistory.pop();
        }
        chrome.storage.local.set({'buildhistory': buildhistory});
    }
}

function getParameterByName(name, url) {
    if (exists(url)) {
        url = url.replace("&amp;", "&");
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(url);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
    return null;
}

function relationshipToHead(focusrel, relationship) {
    //console.log(focusrel + ":" + relationship);
    if (focusrel === "notfound" && relationship !== "notfound") {
        return "unknown";
    } else if (relationship === "notfound") {
        return relationship;
    } else if (focusrel === "head" || focusrel === "self") {
        if (isChild(relationship) || isPartner(relationship) || isParent(relationship) || isSibling(relationship)) {
            return relationship;
        } else if (relationship !== "") {
            return "exclude";
        }
    } else if (isChild(focusrel)) {
        if (relationship === "head" || relationship === "self") {
            return "parent";
        } else if (isChild(relationship)) {
            return "sibling";
        } else if (isPartner(relationship)) {
            return "parent";
        } else if (relationship !== "") {
            return "exclude";
        }
    } else if (isPartner(focusrel)) {
        if (relationship === "head" || relationship === "self") {
            return "spouse";
        } else if (isChild(relationship)) {
            return relationship;
        } else if (relationship.contains("-in-law")) {
            return relationship.replace("-in-law", "");
        } else if (relationship !== "") {
            return "exclude";
        }
    } else if (isParent(focusrel)) {
        if (relationship === "head" || relationship === "self") {
            return "child";
        } else if (isParent(relationship)) {
            return "spouse";
        } else if (relationship !== "") {
            return "exclude";
        }
    } else if (isSibling(focusrel)) {
        if (relationship === "head" || relationship === "self") {
            return "sibling";
        } else if (relationship !== "") {
            return "exclude";
        }
    } else if (focusrel.contains("-in-law")) {
        var focusinlaw = focusrel.replace("-in-law", "");
        if (isPartner(relationship)) {
            return reverseRelationship(focusinlaw);
        } else if (relationship.contains("-in-law")) {
            var relationinlaw = relationship.replace("-in-law", "");
            if (!isChild(relationinlaw)) {
                return relationshipToHead(focusinlaw, relationinlaw);
            }
        } else if (relationship !== "") {
            return "exclude";
        }
    } else if (focusrel !== "" && focusrel !== "unknown") {
        return "exclude";
    }
    return "unknown";
}

function reverseRelationship(relationship) {
    if (relationship === "wife") {
        return "husband";
    } else if (relationship === "husband") {
        return "wife";
    } else if (relationship === "son" || relationship === "daughter" || relationship === "child" || relationship === "children") {
        if (focusgender === "male") {
            return "father";
        } else if (focusgender === "female") {
            return "mother";
        } else {
            return "parent";
        }
    } else if (relationship === "parents" || relationship === "parent" || relationship === "father" || relationship === "mother") {
        if (focusgender === "male") {
            return "son";
        } else if (focusgender === "female") {
            return "daughter";
        } else {
            return "child";
        }
    } else if (relationship === "siblings" || relationship === "sibling" || relationship === "sister" || relationship === "brother") {
        if (focusgender === "male") {
            return "brother";
        } else if (focusgender === "female") {
            return "sister";
        } else {
            return "sibling";
        }
    } else if (relationship === "partner") {
        return "partner";
    } else if (relationship === "ex-wife") {
        return "ex-husband";
    } else if (relationship === "ex-husband") {
        return "ex-wife";
    } else if (relationship === "ex-partner") {
        return "ex-partner";
    } else {
        return "";
    }
}

// ----- Persistent Options -----
$(function () {
    $('#privateonoffswitch').on('click', function () {
        chrome.storage.local.set({'autoprivate': this.checked});
        var profilegroup = $('.checkall');
        for (var group in profilegroup) if (profilegroup.hasOwnProperty(group)) {
            if (profilegroup[group].checked) { //only check it if the section is checked
                var privateprofiles = $(profilegroup[group]).closest('div').find('.checkslide');
                for (var profile in privateprofiles) if (privateprofiles.hasOwnProperty(profile)) {
                    if (exists(privateprofiles[profile]) && exists(privateprofiles[profile].name) && privateprofiles[profile].name.startsWith("checkbox")) {
                        if ($(privateprofiles[profile]).next().text().startsWith("\<Private\>")) {
                            $(privateprofiles[profile]).prop('checked', !this.checked);
                            var fs = $("#" + privateprofiles[profile].name.replace("checkbox", "slide"));
                            fs.find('[type="checkbox"]').prop('checked', !this.checked);
                            fs.find('input[type="text"]').not(".genislideinput").attr('disabled', this.checked);
                        }
                    }
                }
            }
        }
    });
    $('#geoonoffswitch').on('click', function () {
        chrome.storage.local.set({'autogeo': this.checked});
        geoonoff(this.checked);
        hideempty($('#hideemptyonoffswitch').prop('checked'));
    });
    $('#forcegeoswitch').on('click', function () {
        chrome.storage.local.set({'forcegeo': this.checked});
        $("#forcegeochange").css("display", "block");
    });
    $('#genislideonoffswitch').on('click', function () {
        chrome.storage.local.set({'genislideout': this.checked});
        if (this.checked) {
            $("body").css('max-width', "500px");
            $("#genislider").find("img")[0].src = "images/closemenu.png";
            $("#controlimage").slideDown();
            slideopen = this.checked;
        }
    });

    $('#birthonoffswitch').on('click', function () {
        chrome.storage.local.set({'autobirth': this.checked});
        var profilegroup = $('.checkall');
        for (var group in profilegroup) if (profilegroup.hasOwnProperty(group)) {
            if (profilegroup[group].id === "addchildck" || profilegroup[group].id === "addsiblingck") {
                var privateprofiles = $(profilegroup[group]).closest('div').find('.checkslide');
                for (var profile in privateprofiles) if (privateprofiles.hasOwnProperty(profile)) {
                    if (exists(privateprofiles[profile]) && exists(privateprofiles[profile].name) && privateprofiles[profile].name.startsWith("checkbox")) {
                        var fs = $("#" + privateprofiles[profile].name.replace("checkbox", "slide"));
                        var lname = fs.find('[name="last_name"]')[0];
                        var bname = fs.find('[name="maiden_name"]')[0];
                        if (this.checked) {
                            if (bname.value === "") {
                                bname.value = lname.value;
                            }
                        } else {
                            if (bname.value === lname.value) {
                                bname.value = "";
                            }
                        }
                    }
                }
            } else if (profilegroup[group].id === "addparentck" || profilegroup[group].id === "addpartnerck") {
                var privateprofiles = $(profilegroup[group]).closest('div').find('.checkslide');
                for (var profile in privateprofiles) if (privateprofiles.hasOwnProperty(profile)) {
                    if (exists(privateprofiles[profile]) && exists(privateprofiles[profile].name) && privateprofiles[profile].name.startsWith("checkbox")) {
                        var fs = $("#" + privateprofiles[profile].name.replace("checkbox", "slide"));
                        var genderobj = fs.find('[name="gender"]')[0];
                        var gender = genderobj.options[genderobj.selectedIndex].value;
                        if (gender === "male") {
                            var lname = fs.find('[name="last_name"]')[0];
                            var bname = fs.find('[name="maiden_name"]')[0];
                            if (this.checked) {
                                if (bname.value === "") {
                                    bname.value = lname.value;
                                }
                            } else {
                                if (bname.value === lname.value) {
                                    bname.value = "";
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    $('#mnameonoffswitch').on('click', function () {
        chrome.storage.local.set({'automname': this.checked});
        var profilegroup = $('.checkall');
        for (var group in profilegroup) if (profilegroup.hasOwnProperty(group)) {
            var privateprofiles = $(profilegroup[group]).closest('div').find('.checkslide');
            for (var profile in privateprofiles) if (privateprofiles.hasOwnProperty(profile)) {
                if (exists(privateprofiles[profile]) && exists(privateprofiles[profile].name) && privateprofiles[profile].name.startsWith("checkbox")) {
                    if (exists($(privateprofiles[profile]).next()[0])) {
                        var name = NameParse.parse($(privateprofiles[profile]).next()[0].text, this.checked);
                        var fs = $("#" + privateprofiles[profile].name.replace("checkbox", "slide"));
                        var fname = fs.find('[name="first_name"]')[0];
                        var mname = fs.find('[name="middle_name"]')[0];
                        fname.value = name.firstName;
                        mname.value = name.middleName;

                    }
                }
            }

        }
    });
    $('#adjustnameonoffswitch').on('click', function () {
        chrome.storage.local.set({'adjustname': this.checked});
        $("#casenamechange").css("display", "block");
    });
    $('#compountlastonoffswitch').on('click', function () {
        chrome.storage.local.set({'compoundlast': this.checked});
        $("#compoundlast").css("display", "block");
    });
    $('#sourceonoffswitch').on('click', function () {
        chrome.storage.local.set({'addsource': this.checked});
    });
    $('#photoonoffswitch').on('click', function () {
        if (this.checked) {
            $("#photochange").css("display", "block");
        }
        chrome.storage.local.set({'addphoto': this.checked});
    });
    $('#geniparentonoffswitch').on('click', function () {
        chrome.storage.local.set({'geniparent': this.checked});
        $("#gparentchange").css("display", "block");
        //TODO Make this a live change
    });
    $('#burialonoffswitch').on('click', function () {
        chrome.storage.local.set({'burialdate': this.checked});
        $("#burialchange").css("display", "block");
        //TODO Make this a live change
    });
    $('#hideemptyonoffswitch').on('click', function () {
        chrome.storage.local.set({'hideempty': this.checked});
        if (!this.checked) {
            document.getElementById("profiledata").style.display = "block";
        } else if (hideprofile) {
            document.getElementById("profiledata").style.display = "none";
        }
        hideempty(this.checked);
    });
    function hideempty(value) {
        if (value) {
            $('#formdata').find(".hiddenrow").css("display", "none");
            $('.showhide').attr("src", "images/show.png");
            $('.showhide').attr("title", "Show All Fields");
        } else {
            $('#formdata').find(".hiddenrow").css("display", "table-row");
            $('.showhide').attr("src", "images/hide.png");
            $('.showhide').attr("title", "Hide Unused Fields");
            geoonoff($('#geoonoffswitch').prop('checked'));
        }
    }

    var modal = document.getElementById('GeoUpdateModal');
    var modal2 = document.getElementById('AboutModal');

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
        if (event.target == modal2) {
            modal2.style.display = "none";
        }
    };
    var firefox = (navigator.userAgent.toLowerCase().indexOf('firefox') > -1);
    var ffscrollcheck = null;
    var isDragging = false;
    if (firefox) {
        //Firefox jump to top bug
        $(window).mousedown(function(event) {
            ffscrollcheck = $(window).scrollTop();
            isDragging = false;
        });
        $(window).mousemove(function(event) {
            isDragging = true;
        });
        $(window).mouseup(function(event) {
            isDragging = false;
        });
        window.onwheel = function(event) {
            ffscrollcheck = null;
        }
        $(window).scroll(function() {
            if(ffscrollcheck && !isDragging && $(window).scrollTop() === 0) {
                $(window).scrollTop(ffscrollcheck);
            }
        });
    }

    $(function () {
        $('.aboutdev').on('click', function () {
            var modal2 = document.getElementById('AboutModal');
            modal2.style.display = "block";
            $('body').css('min-height', '390px');
        });
    });
    $(function () {
        // When the user clicks on <span> (x), close the modal
        $('#modalclose2').on('click', function () {
            document.getElementById('AboutModal').style.display = "none";
            $('body').css('min-height', '');
        });
    });
    $(function () {
        // When the user clicks on <span> (x), close the modal
        $('#modalclose1').on('click', function () {
            document.getElementById('GeoUpdateModal').style.display = "none";
        });
    });
    $(function () {
        $('#geolookupbtn').on('click', function () {
            $("body").toggleClass("wait");
            googlerequery = $('#geoupdatetext').attr("reference");
            var modal = document.getElementById('GeoUpdateModal');
            var locationset = {"id": geoid, "location": $('#geoupdatetext').val()};
            modal.style.display = "none";
            queryGeo(locationset);
            updateGeoLocation();
            geoid++;
        });
    });
    $("#geoupdatetext").keyup(function(event){
        if(event.keyCode == 13){
            $("#geolookupbtn").click();
        }
    });
    $(function () {
        $('#georevertbtn').on('click', function () {
            $('#geoupdatetext').val($('#georevertbtn').attr("value"));
        });
    });
});

function geoonoff(value) {
    if (value) {
        var locobj = document.getElementsByClassName("geoloc");
        for (var i = 0; i < locobj.length; i++) {
            locobj[i].style.display = "table-row";
            var pinput = $(locobj[i]).find('input[type="text"]');
            pinput.filter(function (item) {
                var checkbox = $(pinput[item]).closest("tr").find('input[type="checkbox"]');
                return (pinput[item].value !== "" && checkbox.checked);
            }).prop("disabled", false);
        }
        var placeobj = document.getElementsByClassName("geoplace");
        for (var i = 0; i < placeobj.length; i++) {
            placeobj[i].style.display = "none";
            //$(placeobj[i]).find(":input:text").prop("disabled", true);
        }
        $(".geoicon").attr("src", "images/geoon.png");
    } else {
        var locobj = document.getElementsByClassName("geoloc");
        for (var i = 0; i < locobj.length; i++) {
            locobj[i].style.display = "none";
            //$(locobj[i]).find(":input:text").prop("disabled", true);
        }
        var placeobj = document.getElementsByClassName("geoplace");
        for (var i = 0; i < placeobj.length; i++) {
            placeobj[i].style.display = "table-row";
            var pinput = $(placeobj[i]).find('input[type="text"]').not(".genislideinput");
            pinput.filter(function (item) {
                var checkbox = $(pinput[item]).closest("tr").find('input[type="checkbox"]');
                return (pinput[item].value !== "" && checkbox.checked);
            }).prop("disabled", false);
        }
        $(".geoicon").attr("src", "images/geooff.png");
    }
}

function hostDomain(url) {
    var a = document.createElement('a');
    a.href = url;
    return a.protocol + "//" + a.host;
};

chrome.storage.local.get('autogeo', function (result) {
    var geochecked = result.autogeo;
    if (exists(geochecked)) {
        $('#geoonoffswitch').prop('checked', geochecked);
    }
});

chrome.storage.local.get('forcegeo', function (result) {
    var forcechecked = result.forcegeo;
    if (exists(forcechecked)) {
        $('#forcegeoswitch').prop('checked', forcechecked);
    }
});

chrome.storage.local.get('adjustname', function (result) {
    var adjustname = result.adjustname;
    if (exists(adjustname)) {
        $('#adjustnameonoffswitch').prop('checked', adjustname);
    }
});

chrome.storage.local.get('compoundlast', function (result) {
    var compoundlast = result.compoundlast;
    if (exists(compoundlast)) {
        $('#compountlastonoffswitch').prop('checked', compoundlast);
    }
});

chrome.storage.local.get('autoprivate', function (result) {
    var privatechecked = result.autoprivate;
    if (exists(privatechecked)) {
        $('#privateonoffswitch').prop('checked', privatechecked);
    }
});

chrome.storage.local.get('genislideout', function (result) {
    var genislideoutchecked = result.genislideout;
    if (!exists(genislideoutchecked)) {
        genislideoutchecked = true;
    }
    $('#genislideonoffswitch').prop('checked', genislideoutchecked);
    if (genislideoutchecked) {
        $('body').css('max-width', '500px');
        $("#controlimage").slideDown();
        slideopen = true;
        $("#genislider").find("img")[0].src = "images/closemenu.png";
    } else {
        $('body').css('max-width', '340px');
        $("#controlimage").slideUp();
        slideopen = false;
        $("#configtext").hide();
        $("#genislider").find("img")[0].src = "images/openmenu.png";
    }

});

chrome.storage.local.get('autobirth', function (result) {
    var birthchecked = result.autobirth;
    if (exists(birthchecked)) {
        $('#birthonoffswitch').prop('checked', birthchecked);
    }
});

chrome.storage.local.get('automname', function (result) {
    var mnamechecked = result.automname;
    if (exists(mnamechecked)) {
        $('#mnameonoffswitch').prop('checked', mnamechecked);
    }
});

chrome.storage.local.get('hideempty', function (result) {
    var hidechecked = result.hideempty;
    if (exists(hidechecked)) {
        $('#hideemptyonoffswitch').prop('checked', hidechecked);
        if (!$('#hideemptyonoffswitch').prop('checked')) {
                $("#focusshowhide").attr("src", "images/hide.png");
                $("#focusshowhide").attr("title", "Hide Unused Fields");
            }
    }
});

chrome.storage.local.get('burialdate', function (result) {
    var burialchecked = result.burialdate;
    if (exists(burialchecked)) {
        $('#burialonoffswitch').prop('checked', burialchecked);
    }
});

chrome.storage.local.get('geniparent', function (result) {
    var gparentchecked = result.geniparent;
    if (exists(gparentchecked)) {
        $('#geniparentonoffswitch').prop('checked', gparentchecked);
    }
});

chrome.storage.local.get('addsource', function (result) {
    var sourcechecked = result.addsource;
    if (exists(sourcechecked)) {
        $('#sourceonoffswitch').prop('checked', sourcechecked);
    }
});

chrome.storage.local.get('addphoto', function (result) {
    var addphotochecked = result.addphoto;
    if (exists(addphotochecked)) {
        $('#photoonoffswitch').prop('checked', addphotochecked);
    }
});
