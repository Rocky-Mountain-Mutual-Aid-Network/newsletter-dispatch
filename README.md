# RMMAN Dispatch System
This tool uses a simple webpage, `Vue.js`, and Google Forms to create a place to submit dispatches for the world to see.

Google Form: https://docs.google.com/forms/d/e/1FAIpQLSehY69f_ys2Mg2mwEthgRpEHgFHE7q2SYSIFZPg00YrdPjnew/viewform
Google Sheet: https://docs.google.com/spreadsheets/d/1QuEmayHBfAKDy6Ajs6rtIH-XncdYhBQvS2bbi4I8TX4/edit

## How it works

A Google Form sends data to a Google Sheet, the **published** Google Sheet is pulled in as json to this application.
Vue.js is used to parse the data.

The form on the site simply POSTs data to the Google Form action url. The corresponding input name attributes are
gathered from the form.