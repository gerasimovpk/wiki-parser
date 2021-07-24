import rp from 'request-promise';
import cheerio from 'cheerio';

export function parseYearlyPage(yearInt) {
  let url = 'https://ru.wikipedia.org/wiki/' + yearInt + '_%D0%B3%D0%BE%D0%B4';

  return rp(url)
    .then(function (html) {

      let $ = cheerio.load(html);

      var elements = $(".mw-parser-output > h3, .mw-parser-output > h2, .mw-parser-output > ul");

      var arr = elements.toArray();

      var result = arr.reduce((r, o) => {

        if (o.tagName.toLowerCase() === 'h2') {
          let headline = $(o).find(".mw-headline")[0];
          let name = headline.childElementCount > 0 ? headline.firstChild.innerHTML : headline.innerHTML;

          return [...r, { name: name, content: [] }];
        }

        if (r.length === 0) return [[o]];

        r[r.length - 1].content.push(o);

        return r;
      }, []);

      var filteredResults = result.filter((el) => el.content.length > 0);
      var categories = filteredResults.map((el) => {
        let cat = {
          name: el.name,
          monthlyEvents: el.content.reduce((r, o) => {

            if (o.tagName.toLowerCase() === 'h3') {
              let headline = $(o).find(".mw-headline")[0];
              let name = headline.firstChild.innerHTML;

              return [...r, { name: name, content: [] }];
            }

            if (o.tagName.toLowerCase() === 'ul') {
              let ulChildNodes = $(o.children).toArray();
              let ulChildNodesWithoutLineBreaks = ulChildNodes.filter((node) => node.type == 'tag');

              let ulContent = ulChildNodesWithoutLineBreaks.map((li) => {
                let internalList = $(li).find("ul");
                if (internalList.length > 0) {
                  let dateStr = $(li).find("a").first().text();

                  return $(internalList.children()).toArray().map((intLi) => {
                    return [dateStr, $(intLi).text()];
                  });
                } else {
                  let dateDescriptionFullText = $(li).text().trim();
                  return dateDescriptionFullText.split('—');
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

        return cat;
      });

      categories.forEach((category, index) => {
        category.allEvents = category.monthlyEvents.reduce((result, curObj) => {
          let isNested = Array.isArray(curObj.content[0]);
          let datedEvents;

          if (isNested) {
            datedEvents = curObj.content.map((nestedEl) => {
              return {
                stringDate: getDateStr(nestedEl[0], yearInt),
                monthlyDate: curObj.date,
                description: nestedEl.join(';'),
              };
            });
          } else {
            datedEvents = curObj.content.length > 0 ? [{
              stringDate: getDateStr(curObj.content[0], yearInt),
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
      console.log(yearInt + 'raised error' + err.toString())
    });
}

function getDateStr(domElValue, yearInt) {
  let str = domElValue.trim() + " " + yearInt;

  str = str.replace('января', "January");
  str = str.replace('февраля', "February");
  str = str.replace('марта', "March");
  str = str.replace('апреля', "April");
  str = str.replace('мая', "May");
  str = str.replace('июня', "June");
  str = str.replace('июля', "July");
  str = str.replace('августа', "August");
  str = str.replace('сентября', "September");
  str = str.replace('октября', "October");
  str = str.replace('ноября', "November");
  str = str.replace('декабря', "December");

  return str;
}