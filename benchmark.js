// benchmark.js

const records = Array.from({ length: 1000 }, (_, i) => ({
    id: i.toString(),
    name: `Customer ${i}`,
    type: i % 2 === 0 ? 'person' : 'legal',
    nationalId: `123456789${i % 10}`,
    phone: `0912345678${i % 10}`,
    active: true
}));

const search = { value: '' };
let rowsHTML = '';
const Finora = { escape: v => v };

function render() {
    const term = search.value.trim().toLowerCase();
    const visible = records.filter(x => x.active !== false && (!term || [x.name, x.phone, x.nationalId].some(v => String(v || '').toLowerCase().includes(term))));
    rowsHTML = visible.map(x => `<tr><td>${Finora.escape(x.name)}</td><td>${x.type === 'person' ? 'حقیقی' : 'حقوقی'}</td><td>${Finora.escape(x.nationalId || '—')}</td><td>${Finora.escape(x.phone || '—')}</td><td><div class="actions"><button type="button" class="btn btn-secondary" data-edit="${x.id}">ویرایش</button><button type="button" class="btn btn-danger" data-archive="${x.id}">بایگانی</button></div></td></tr>`).join('') || '<tr><td colspan="5" class="empty">مشتری فعالی ثبت نشده است.</td></tr>';
}

function simulateTypingWithoutDebounce(text) {
    let renderCount = 0;
    const start = performance.now();
    for (let i = 1; i <= text.length; i++) {
        search.value = text.substring(0, i);
        render();
        renderCount++;
    }
    const end = performance.now();
    return { renderCount, time: end - start };
}

function simulateTypingWithDebounce(text) {
    return new Promise(resolve => {
        let renderCount = 0;
        let timeout;

        const debouncedRender = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                render();
                renderCount++;
                const end = performance.now();
                resolve({ renderCount, time: end - start });
            }, 300);
        };

        const start = performance.now();
        for (let i = 1; i <= text.length; i++) {
            search.value = text.substring(0, i);
            debouncedRender();
        }
    });
}

async function runBenchmark() {
    console.log("Starting Benchmark: Typing 'Customer 999' rapidly");
    const textToType = "Customer 999";

    // Warmup
    for(let i = 0; i < 5; i++) {
        search.value = textToType;
        render();
    }
    search.value = '';

    const withoutDebounce = simulateTypingWithoutDebounce(textToType);
    console.log(`Without Debounce: ${withoutDebounce.renderCount} renders, ${withoutDebounce.time.toFixed(2)}ms`);

    search.value = '';
    const withDebounce = await simulateTypingWithDebounce(textToType);
    // subtract the 300ms timeout delay from the measured time
    console.log(`With Debounce: ${withDebounce.renderCount} renders, ${(withDebounce.time - 300).toFixed(2)}ms (execution time only)`);
}

runBenchmark();
