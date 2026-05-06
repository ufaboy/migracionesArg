const STORAGE_KEY = 'migraciones_form_v1';
const API_ENDPOINT = '/api/consulta';

const byId = (id) => document.getElementById(id);

const formElement = byId('form');
const fileNumberInput = byId('nro_expediente');
const dayInput = byId('day');
const monthInput = byId('month');
const yearInput = byId('year');
const submitButton = byId('submitBtn');
const messageElement = byId('message');
const resultContainer = byId('result');
const resultBodyElement = byId('resultBody');

function getFormValues() {
  return {
    nro_expediente: fileNumberInput.value.trim(),
    day: dayInput.value.trim(),
    month: monthInput.value.trim(),
    year: yearInput.value.trim(),
  };
}

function saveFormToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getFormValues()));
  } catch (_) {}
}

function restoreFormFromStorage() {
  try {
    const storedJson = localStorage.getItem(STORAGE_KEY);
    if (!storedJson) return;
    const formValues = JSON.parse(storedJson) || {};
    if (formValues.nro_expediente) fileNumberInput.value = formValues.nro_expediente;
    if (formValues.day) dayInput.value = formValues.day;
    if (formValues.month) monthInput.value = formValues.month;
    if (formValues.year) yearInput.value = formValues.year;
  } catch (_) {}
}

function padTwoDigits(value) {
  return String(value).padStart(2, '0');
}

function setMessage(text, messageType) {
  messageElement.textContent = text || '';
  messageElement.className = 'msg' + (messageType ? ' ' + messageType : '');
}

function renderObjectAsDefinitionList(data) {
  const entryKeys = Object.keys(data || {});
  if (entryKeys.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty';
    emptyMessage.textContent = 'No data';
    return emptyMessage;
  }

  const definitionList = document.createElement('dl');
  for (const key of entryKeys) {
    const term = document.createElement('dt');
    term.textContent = key;

    const description = document.createElement('dd');
    const value = data[key];
    description.textContent =
      value === null || value === undefined
        ? ''
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

    definitionList.appendChild(term);
    definitionList.appendChild(description);
  }
  return definitionList;
}

function renderRowsAsTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty';
    emptyMessage.textContent = 'No results';
    return emptyMessage;
  }

  const columnNames = [];
  const seenColumns = new Set();
  for (const row of rows) {
    if (row && typeof row === 'object') {
      for (const key of Object.keys(row)) {
        if (!seenColumns.has(key)) {
          seenColumns.add(key);
          columnNames.push(key);
        }
      }
    }
  }

  if (columnNames.length === 0) {
    const jsonFallback = document.createElement('pre');
    jsonFallback.textContent = JSON.stringify(rows, null, 2);
    return jsonFallback;
  }

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'table-wrap';
  const table = document.createElement('table');

  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const columnName of columnNames) {
    const headerCell = document.createElement('th');
    headerCell.textContent = columnName;
    headerRow.appendChild(headerCell);
  }
  tableHead.appendChild(headerRow);
  table.appendChild(tableHead);

  const tableBody = document.createElement('tbody');
  for (const row of rows) {
    const bodyRow = document.createElement('tr');
    for (const columnName of columnNames) {
      const cell = document.createElement('td');
      const value = row ? row[columnName] : undefined;
      cell.textContent =
        value === null || value === undefined
          ? ''
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
      bodyRow.appendChild(cell);
    }
    tableBody.appendChild(bodyRow);
  }
  table.appendChild(tableBody);
  tableWrapper.appendChild(table);
  return tableWrapper;
}

function countResolvedSteps(rows) {
  let resolved = 0;
  for (const row of rows) {
    if (row && row.RESUELTO === 't') resolved += 1;
  }
  return resolved;
}

function renderProgressSteps(rows) {
  const stepsList = document.createElement('ol');
  stepsList.className = 'vprogress';

  const resolvedCount = countResolvedSteps(rows);

  rows.forEach((row, index) => {
    const oneBasedIndex = index + 1;
    const stepItem = document.createElement('li');
    stepItem.className = 'step';

    if (oneBasedIndex <= resolvedCount) {
      stepItem.classList.add('done');
    } else if (oneBasedIndex === resolvedCount + 1) {
      stepItem.classList.add('active');
    }

    const dotElement = document.createElement('span');
    dotElement.className = 'dot';
    dotElement.textContent = String(oneBasedIndex);

    const labelElement = document.createElement('span');
    labelElement.className = 'label';
    labelElement.textContent = (row && row.DESCRIPCION) || '';

    stepItem.appendChild(dotElement);
    stepItem.appendChild(labelElement);
    stepsList.appendChild(stepItem);
  });

  return stepsList;
}

function rowsLookLikeProcedureSteps(rows) {
  return (
    Array.isArray(rows) &&
    rows.length > 0 &&
    rows.every(
      (row) => row && typeof row === 'object' && 'DESCRIPCION' in row && 'RESUELTO' in row,
    )
  );
}

function renderApiResponse(responseData) {
  resultBodyElement.innerHTML = '';

  const personSectionTitle = document.createElement('h3');
  personSectionTitle.textContent = 'Applicant data';
  resultBodyElement.appendChild(personSectionTitle);
  resultBodyElement.appendChild(
    renderObjectAsDefinitionList(responseData && responseData.datos_persona),
  );

  const dataRows = responseData && responseData.data;
  const dataSectionTitle = document.createElement('h3');
  dataSectionTitle.textContent = rowsLookLikeProcedureSteps(dataRows) ? 'Procedure progress' : 'data';
  resultBodyElement.appendChild(dataSectionTitle);

  if (rowsLookLikeProcedureSteps(dataRows)) {
    const stepsList = renderProgressSteps(dataRows);
    resultBodyElement.appendChild(stepsList);
  } else {
    resultBodyElement.appendChild(renderRowsAsTable(dataRows));
  }

  resultContainer.classList.add('visible');
}

formElement.addEventListener('input', saveFormToStorage);

formElement.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveFormToStorage();

  const formValues = getFormValues();
  if (!formValues.nro_expediente || !formValues.day || !formValues.month || !formValues.year) {
    setMessage('Please fill in all 4 fields.', 'error');
    return;
  }

  const day = parseInt(formValues.day, 10);
  const month = parseInt(formValues.month, 10);
  const year = parseInt(formValues.year, 10);
  const isDayValid = day >= 1 && day <= 31;
  const isMonthValid = month >= 1 && month <= 12;
  const isYearValid = year >= 1900 && year <= 2099;
  if (!isDayValid || !isMonthValid || !isYearValid) {
    setMessage('Invalid date.', 'error');
    return;
  }

  const fecha_nac = padTwoDigits(day) + '/' + padTwoDigits(month) + '/' + year;

  const requestBody = new FormData();
  requestBody.append(
    'data',
    JSON.stringify({
      nro_expediente: formValues.nro_expediente,
      fecha_nac,
    }),
  );

  submitButton.disabled = true;
  submitButton.textContent = 'Checking…';
  setMessage('Sending request…', 'info');
  resultContainer.classList.remove('visible');

  try {
    const response = await fetch(API_ENDPOINT, { method: 'POST', body: requestBody });
    if (!response.ok) throw new Error('HTTP ' + response.status);

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (_) {
      throw new Error('Response is not JSON: ' + responseText.slice(0, 200));
    }

    setMessage('', '');
    renderApiResponse(responseData);
  } catch (error) {
    setMessage('Error: ' + (error && error.message ? error.message : error), 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Check status';
  }
});

restoreFormFromStorage();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
