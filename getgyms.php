<?php
//Use same config as bot
require_once("config.php");

// Establish mysql connection.
$dbh = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASSWORD, array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION));
$dbh->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

$rows = array();
try {

    $sql = "SELECT 
                gyms.id,
                gyms.lat,
                gyms.lon,
                gyms.gym_name,
                gyms.address,
                gyms.ex_gym,
                team.team as team,
                team.slots_available,
                SEC_TO_TIME(TIMESTAMPDIFF(SECOND,FROM_UNIXTIME(team.last_modified),CURRENT_TIMESTAMP())) as since,
                team.image_link as image_link
            FROM
                gyms,
                mapadroid.gym_team AS team
            WHERE
                gyms.external_id = team.external_id";
    $result = $dbh->query($sql);

    while ($gym = $result->fetch(PDO::FETCH_ASSOC)) {

        $rows[] = $gym;
    }
} catch (PDOException $exception) {

    error_log($exception->getMessage());
    $dbh = null;
    exit;
}

if (!defined('PRINT_DATA') || PRINT_DATA) {
    print json_encode($rows);
}

$dbh = null;