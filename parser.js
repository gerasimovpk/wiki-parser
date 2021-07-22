const rp = require('request-promise');
const cheerio = require('cheerio');

function parseYearlyPage(yearInt) {
  let url = 'https://ru.wikipedia.org/wiki/' + yearInt + '_%D0%B3%D0%BE%D0%B4';

  rp(url)
    .then(function (html) {

      let $ = cheerio.load(html);

      var elements = $(".mw-parser-output > h3, .mw-parser-output > h2, .mw-parser-output > ul");

      arr = elements.toArray();

      result = arr.reduce((r, o) => {

        if (o.tagName.toLowerCase() === 'h2') {
          let headline = $(o).find(".mw-headline")[0];
          let name = headline.childElementCount > 0 ? headline.firstChild.innerHTML : headline.innerHTML;

          return [...r, { name: name, content: [] }];
        }

        if (r.length === 0) return [[o]];

        r[r.length - 1].content.push(o);

        return r;
      }, []);

      filteredResults = result.filter((el) => el.content.length > 0);
      categories = filteredResults.map((el) => {
        let cat = {
          name: el.name,
          monthlyEvents: el.content.reduce((r, o) => {

            if (o.tagName.toLowerCase() === 'h3') {
              let headline = $(o).find(".mw-headline")[0];
              let name = headline.firstChild.innerHTML;

              return [...r, { name: name, content: [] }];
            }

            if (o.tagName.toLowerCase() === 'ul') {
              let ulContent = $(o.children).toArray().map((li) => {
                let internalList = $(li).find("ul");
                if (internalList.length > 0) {
                  let dateStr = $(li).find("a").first().text();

                  return $(internalList.children()).toArray().map((intLi) => {
                    return [dateStr, $(intLi).text()];
                  });
                } else {
                  return $(li).text().split('—');
                }
              });

              return [...r, ...ulContent.map((el) => {
                return {
                  content: el
                }
              })];
            }

            if (r.length === 0) return [[o]];

            r[r.length - 1].content = ulContent;

            return r;
          }, [])
        };

        cat.monthlyEvents.forEach((el, idx) => {
          if (idx < 12) {
            el.date = new Date(1961, idx);
          } else {
            el.date = new Date(1961, 0);
          }

          return el;
        })

        return cat;
      });

      categories.forEach((category, index) => {
        category.allEvents = category.monthlyEvents.reduce((result, curObj) => {
          let isNested = Array.isArray(curObj.content[0]);
          let datedEvents;

          if (isNested) {
            datedEvents = curObj.content.map((nestedEl) => {
              return {
                stringDate: nestedEl[0].trim() + " " + yearInt,
                monthlyDate: curObj.date,
                description: nestedEl.join(';'),
              };
            });
          } else {
            datedEvents = curObj.content.length > 0 ? [{
              stringDate: curObj.content[0].trim() + " " + yearInt,
              monthlyDate: curObj.date,
              description: curObj.content.join(';'),
            }] : [];
          }


          return [...result, ...datedEvents];
        }, []);

        delete category.monthlyEvents;
      });

      let output = categories[0].allEvents.map((ev) => { return ev.stringDate + "|" + ev.description }).join("\r\n");

      console.log(output);


    })
    .catch(function (err) {
      //handle error
    });
}

parseYearlyPage(1862);