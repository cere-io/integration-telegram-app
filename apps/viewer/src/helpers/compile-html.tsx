import hbs from 'handlebars';

hbs.registerHelper('json', (context) => JSON.stringify(context));

export const compileHtml = (html: string, data: any) => {
  return hbs.compile(html)({ data });
};
