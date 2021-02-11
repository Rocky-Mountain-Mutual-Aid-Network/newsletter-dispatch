"use strict"

var app = new Vue({
    el: "#main",
    data: {
        // workbook information about the target spreadsheet
        workbook: {
            // spreadsheet ID (https://docs.google.com/spreadsheets/d/1QuEjanHBfAKDy6Ajs6rtIH-XncdYhBQvS2bbi4I8TX4/edit)
            //                                                this >> 1QuEjanHBfAKDy6Ajs6rtIH-XncdYhBQvS2bbi4I8TX4
            id: "1QuEmayHBfAKDy6Ajs6rtIH-XncdYhBQvS2bbi4I8TX4",
            // The SheetID for the workbook's sheets
            // See http://damolab.blogspot.com/2011/03/od6-and-finding-other-worksheet-ids.html
            // This can be a string OR the numbered position of the tab on the
            // workbook starting with 1 as the left most tab... yeah it's crazy
            sheets: {
                dispatch: 'od6' // default 1st sheet
            }
        },
        search: '',
        filter: [],
        spreadsheet: {},
        cacheLifeTime: 5000, //hours*60*60*1000
        formVisible: false,
        // The following is used to create the form that submits data to the Google Form
        // The items with 'entry.123456' represent the input name attribute for the corresponding questions on the Google Form
        // The HTML form POSTs to the action URL
        form: {
            view: "https://docs.google.com/forms/d/e/1FAIpQLSehY69f_ys2Mg2mwEthgRpEHgFHE7q2SYSIFZPg00YrdPjnew/viewform",
            action: "https://docs.google.com/forms/u/0/d/e/1FAIpQLSehY69f_ys2Mg2mwEthgRpEHgFHE7q2SYSIFZPg00YrdPjnew/formResponse",
            name: 'entry.106782999',
            title: 'entry.961334192',
            desc: 'entry.450819509',
            link: 'entry.2093079808',
            url: 'entry.1066429746',
            preview: {
                name: '',
                title: '',
                desc: '',
                link: '',
                url: '',
            }
        }
    },

    /**
     * On creation get data
     */
    created: function () {
        this.getData();
    },

    methods: {
        /**
         * for each workbook.sheets get data
         */
        getData: function () {
            for (var i in this.workbook.sheets) {
                var sheetID = this.workbook.sheets[i];
                if (!this.getCache(sheetID)) {
                    this.fetchData(this.workbook.id, sheetID);
                }
            }
        },
        /**
         * Capture data from spreadsheet
         * @param  {string} id    The workbook id
         * @param  {int} sheetID the sheetID or 1 indexed position of the sheet's tab
         * @return {[type]}    sends response to setData and putCache
         * @TODO error handling
         */
        fetchData: function (id, sheetID) {
            var xhr = new XMLHttpRequest(),
                self = this,
                url = 'https://spreadsheets.google.com/feeds/list/' + id + '/1/public/values?alt=json';
            xhr.open('GET', url)
            xhr.onload = function () {
                console.log('data loaded from xhr: ', sheetID);
                self.setData(xhr.responseText, sheetID);
                self.putCache(xhr.responseText, sheetID);
            }
            xhr.send(null)
        },
        /**
         * Sets the data into the spreadsheet object
         * @param  {string} data  The unparsed JSON string
         * @param  {string} sheetID the string reference for the workbook sheet
         */
        setData: function (data, sheetID) {
            this.$set(this.spreadsheet, sheetID, JSON.parse(data))
        },
        /**
         * Puts data in the localStorage
         * @param  {string} data  unparsed JSON string of data
         * @param  {string} sheetID the string reference for the workbook sheet
         */
        putCache: function (data, sheetID) {
            window.localStorage.setItem(sheetID, data);
            console.log('data cached');
        },
        /**
         * grabs only fresh data from the localStorage
         * @param  {string} sheetID the string reference for the workbook sheet
         * @return {bool} If data is pulled from cache returns true otherwise false
         */
        getCache: function (sheetID) {
            if (this.cacheIsFresh() && window.localStorage.getItem(sheetID)) {
                this.setData(window.localStorage.getItem(sheetID), sheetID)
                console.log('data loaded from cache:', sheetID);
                return true;
            }

            return false;

        },
        /**
         * Tests if the cache is fresh and resets the timer if not
         * @return {bool} if the cacheLifeTime is expired return false
         */
        cacheIsFresh: function () {
            var now = new Date().getTime();
            var setupTime = localStorage.getItem('setupTime');
            if (setupTime == null) {
                localStorage.setItem('setupTime', now);
                return false; // cache is NOT fresh
            } else {
                if (now - setupTime > this.cacheLifeTime) {
                    localStorage.clear()
                    localStorage.setItem('setupTime', now);
                    console.log('cache reset');
                    return false; // cache is NOT fresh
                }
                return true; // cache is fresh
            }
        },
        /**
         * strips the http and www from a url
         * @param  {string} url a full URL for website
         * @return {string}     a url without the http and www
         * @TODO gracefull fail if url is null
         */
        stripHTTP: function (url) {
            var regex = new RegExp('(https?://(?:www.)?)', 'gi');
            return url.replace(regex, '')
        },
        /**
         * Removes the trailing slash from a string
         * @param  {string} str string ready to have it's slash removed
         * @return {return}     string, now without a slash
         * @TODO gracefull fail if str is null
         */
        stripSlash: function (str) {
            return str.replace(/\/$/, "");
        },
        /**
         * Makes a URL pretty to look at
         * @param  {string} url a website url
         * @return {string}     a now pretty to look at url
         */
        prettyLink: function (url) {
            return this.stripSlash(this.stripHTTP(url));
        },
        /**
         * Loops through Google Spreadsheet data and returns array of objects
         * constructed from callback
         * @param  {string} sheetID the string reference for the workbook sheet
         * @param  {function} action  a function which passes row data and vue object
         * @return {array}         array of row data, false if sheetID doesn't exist
         */
        gsxRowObject: function (sheetID, action) {
            if (this.spreadsheet[sheetID] === undefined) return false;
            var out = [],
                rows = this.spreadsheet[sheetID].feed.entry,
                self = this;

            for (var i = 0; i < rows.length; i++) {
                var rowObj = action(rows[i], self);
                if (rowObj) out.push(rowObj);
            }

            return out;
        },
        /**
         * Gathers Google Spreadsheet cell data for a particular column
         * @param  {object} row data row from Google Spreadsheet object
         * @param  {string} col name of spreadsheet column to fetch
         * @return {string}     returns cell data, null if cell contains no data
         */
        gsxGetCol: function (row, col) {
            var cell = row['gsx$' + col];
            return (cell && cell.$t) ? cell.$t : null;
        },
    },
    computed: {
        /**
         * Generates an edit link to the Google Spreadsheet
         * @return {string} url to spreadsheet
         */
        workbookEditURL: function () {
            return 'https://docs.google.com/spreadsheets/d/' + this.workbook.id + '/edit';
        },
        /**
         * Creates a cleaned up array of row data objects
         * from the books sheets data
         * the string passed into gsxGetCol corrisponds to the column header
         * on the spreadsheet, lower case and without spaces
         * @return {array} array of objects
         */
        dispatches: function () {
            return this.gsxRowObject(this.workbook.sheets.dispatch, function (r, self) {

                return {
                    time: self.gsxGetCol(r, 'timestamp'),
                    link: self.gsxGetCol(r, 'link'),
                    linkText: self.gsxGetCol(r, 'linktext'),
                    name: self.gsxGetCol(r, 'name'),
                    title: self.gsxGetCol(r, 'title'),
                    description: self.gsxGetCol(r, 'description'),
                }
            });
        },
    },
});