<h2>Step 1: Upload Tracks</h2>

<?php
  date_default_timezone_set("UTC");
  const METHOD = 'aes-256-ctr';

      function encrypt($message, $key)
      {
  				$ivsize = openssl_cipher_iv_length(METHOD);
  				$iv = substr(md5($key), 0, $ivsize);
          $key = md5($key);
          $ciphertext = openssl_encrypt(
              $message,
              METHOD,
              $key,
              0,
              $iv
          );

          return $iv.$ciphertext;

      }

      function decrypt($message, $key)
      {
  				$ivsize = openssl_cipher_iv_length(METHOD);
          $iv = mb_substr($message, 0, $ivsize, '8bit');
          $ciphertext = mb_substr($message, $ivsize, null, '8bit');
          $key = md5($key);

          return openssl_decrypt(
              $ciphertext,
              METHOD,
              $key,
              0,
              $iv
          );
      }

      function hmac_generate($encrypted_text, $signing_key) {

        return bin2hex(hash_hmac('sha256', $encrypted_text, $signing_key, true));

      }

  $payload = array('cat_id' => $artist["cat_id"], 'email' => $artist["email"], 'expires' => time() + 60);
  $payload_json = json_encode($payload);
  $password = "BA5005EA16ADA4A94ACC161AD64C960DD0914F30BCFCDBE0A045A37C7F31EA94";
  $signing_key = "C27211F54D2969B0";

  $encrypted_text = encrypt($payload_json, $password);
  $hmac = hmac_generate($encrypted_text, $signing_key);

  if($artist['v2uploader']) { ?>

  <form id="v2-uploader-login" action="https://crooklyn-clan-v2-jonathancodacity.c9users.io/api/v1/members/account/authenticate" method="POST">
    <input type="hidden" name="payload" value="<?php echo $encrypted_text; ?>" />
    <input type="hidden" name="hmac" value="<?php echo $hmac; ?>" />
  </form>
  <script>
    jQuery('#v2-uploader-login').trigger('submit');
  </script>

<?php } ?>

<form action="?p=configure-uploads" method="GET" enctype="multipart/form-data" name="form1" id="form1">
	<fieldset>

		<p>To begin uploading your tracks. Select the "Browse" button below and upload as many tracks as you'd like.</p>

		<p><strong>Hold the CTRL button to select MULTIPLE FILES</strong></p>

		<p>Be sure to also upload your snippets at this time as well. If you would like our system to auto generate a snippet for you, be sure the file you are uploading is an mp3 and NOT a zip file</p>

		<input id="uploader" type="file" multi="true" afterUpload="link" fileType="file" uid="<?=$artist["cat_id"]?>" />

		<br clear="all">

		<? if( !empty($track["file"]) ) { ?><p class="ribbon-h">You have already uploaded files. You may skip this to continue or re-upload if needed.</p><? } ?>

		<div class="f-continue" style="display:none;"><a href="?p=configure-uploads" class="button">Continue</a></div> <? if( !empty($track["file"]) ) { ?><a href="?p=configure-uploads" class="button">Skip</a><? } ?>

	</fieldset>
</form>
