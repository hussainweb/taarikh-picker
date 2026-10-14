<?php

declare(strict_types=1);

/**
 * Generate golden test fixtures for Fatimid Astronomical Hijri calendar
 * using the reference PHP library `hussainweb/date-converter`.
 *
 * Output: test/fixtures/fatimid.json
 */

$autoloadPaths = [
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/../../taarikh/vendor/autoload.php',
    __DIR__ . '/../../zenweb/vendor/autoload.php',
    dirname(__DIR__, 3) . '/vendor/autoload.php',
];

$autoloadFound = null;
foreach ($autoloadPaths as $path) {
    if (file_exists($path)) {
        $autoloadFound = $path;
        break;
    }
}

if (!$autoloadFound) {
    fwrite(STDERR, "Error: Composer autoload.php not found in any search path.\n");
    exit(1);
}

require_once $autoloadFound;

use Hussainweb\DateConverter\Algorithm\Hijri\HijriFatimidAstronomical;

$algo = new HijriFatimidAstronomical();
$fixtures = [];

// 1. Every 1 Muharram for years 1 through 1600 AH
for ($year = 1; $year <= 1600; $year++) {
    $date = $algo->constructDateValue(1, 1, $year);
    $jdn = (int) $algo->toJulianDay($date);
    $fixtures[] = [
        'type' => 'muharram_1',
        'year' => $year,
        'month' => 1,
        'day' => 1,
        'jdn' => $jdn,
        'isKabisa' => $algo->isKabisa($year),
    ];
}

// 2. Month-end for every month in years 1 through 1600 AH
for ($year = 1; $year <= 1600; $year++) {
    for ($month = 1; $month <= 12; $month++) {
        $lastDay = $algo->getMonthDays($year, $month);
        $date = $algo->constructDateValue($lastDay, $month, $year);
        $jdn = (int) $algo->toJulianDay($date);
        $fixtures[] = [
            'type' => 'month_end',
            'year' => $year,
            'month' => $month,
            'day' => $lastDay,
            'jdn' => $jdn,
            'isKabisa' => $algo->isKabisa($year),
        ];
    }
}

// 3. Fixed deterministic pseudo-random sample across positive years (1..2000 AH)
mt_srand(424242);
for ($i = 0; $i < 1000; $i++) {
    $year = mt_rand(1, 2000);
    $month = mt_rand(1, 12);
    $daysInMonth = $algo->getMonthDays($year, $month);
    $day = mt_rand(1, $daysInMonth);
    $date = $algo->constructDateValue($day, $month, $year);
    $jdn = (int) $algo->toJulianDay($date);
    $fixtures[] = [
        'type' => 'random_sample',
        'year' => $year,
        'month' => $month,
        'day' => $day,
        'jdn' => $jdn,
        'isKabisa' => $algo->isKabisa($year),
    ];
}

$outputDir = __DIR__ . '/../test/fixtures';
if (!is_dir($outputDir)) {
    mkdir($outputDir, 0755, true);
}

$outputFile = $outputDir . '/fatimid.json';
$json = json_encode([
    'generator' => 'scripts/gen-fixtures.php',
    'source' => 'hussainweb/date-converter',
    'count' => count($fixtures),
    'fixtures' => $fixtures,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

file_put_contents($outputFile, $json);
echo "Generated " . count($fixtures) . " golden fixtures in test/fixtures/fatimid.json\n";
